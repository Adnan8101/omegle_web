import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function main() {
    const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        console.error("Could not find tsconfig.json");
        process.exit(1);
    }

    const configResult = ts.readConfigFile(configPath, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(
        configResult.config,
        ts.sys,
        path.dirname(configPath)
    );

    // Force enable unused diagnostics to get unused imports/locals
    compilerOptions.options.noUnusedLocals = true;
    compilerOptions.options.noUnusedParameters = true;

    // Cache file contents in memory and manage versioning
    const fileContents = new Map<string, string>();
    const scriptVersions = new Map<string, number>();

    const getFileContent = (fileName: string): string => {
        if (!fileContents.has(fileName)) {
            const content = fs.readFileSync(fileName, 'utf8');
            fileContents.set(fileName, content);
        }
        return fileContents.get(fileName)!;
    };

    const setFileContent = (fileName: string, content: string) => {
        fileContents.set(fileName, content);
        const currentVersion = scriptVersions.get(fileName) || 0;
        scriptVersions.set(fileName, currentVersion + 1);
    };

    const serviceHost: ts.LanguageServiceHost = {
        getScriptFileNames: () => compilerOptions.fileNames,
        getScriptVersion: (fileName) => {
            const currentVersion = scriptVersions.get(fileName) || 0;
            return currentVersion.toString();
        },
        getScriptSnapshot: (fileName) => {
            if (!fs.existsSync(fileName)) {
                return undefined;
            }
            return ts.ScriptSnapshot.fromString(getFileContent(fileName));
        },
        getCurrentDirectory: () => process.cwd(),
        getCompilationSettings: () => compilerOptions.options,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
    };

    const documentRegistry = ts.createDocumentRegistry();
    const languageService = ts.createLanguageService(serviceHost, documentRegistry);

    // Filter project files to clean (focusing on app, components, and lib directories)
    const filesToFix = compilerOptions.fileNames.filter(f => {
        const relative = path.relative(process.cwd(), f);
        return !relative.startsWith('node_modules') &&
               !relative.startsWith('.next') &&
               (relative.startsWith('app/') || relative.startsWith('components/') || relative.startsWith('lib/'));
    });

    console.log(`🔍 Found ${filesToFix.length} TypeScript files to analyze.`);

    let totalFixedVariables = 0;
    let totalFilesModified = 0;

    for (const fileName of filesToFix) {
        const relativeName = path.relative(process.cwd(), fileName);
        let content = getFileContent(fileName);
        let modified = false;

        // 1. Organize and clean unused imports
        try {
            const organizeChanges = languageService.organizeImports(
                { type: "file", fileName },
                {},
                {}
            );

            if (organizeChanges && organizeChanges.length > 0) {
                for (const change of organizeChanges) {
                    if (change.fileName === fileName) {
                        content = applyTextChanges(content, change.textChanges);
                        setFileContent(fileName, content);
                        modified = true;
                        console.log(`✨ Organized imports in: ${relativeName}`);
                    }
                }
            }
        } catch (e) {
            console.error(`❌ Failed to organize imports in ${relativeName}:`, e);
        }

        // 2. Iterate and fix unused variables one by one, skipping parameter declarations
        try {
            let iteration = 0;
            const maxIterations = 50; // Safeguard against infinite loops

            while (iteration < maxIterations) {
                const diagnostics = languageService.getSemanticDiagnostics(fileName);
                const unusedDiag = diagnostics.find(d => {
                    if ((d.code !== 6133 && d.code !== 6196) || d.start === undefined || d.length === undefined) {
                        return false;
                    }

                    // Get the AST source file to verify if the diagnostic is inside a parameter declaration
                    const sourceFile = languageService.getProgram()?.getSourceFile(fileName);
                    if (sourceFile && isParameterAtPosition(sourceFile, d.start)) {
                        return false; // Skip parameter declarations entirely to preserve positional function arguments
                    }

                    // Safeguard specific variable names
                    const varName = getFileContent(fileName).substring(d.start, d.start + d.length).trim();
                    if (['request', 'req', 'params', 'context', 'res', 'response', 'props'].includes(varName)) {
                        return false;
                    }

                    return true;
                });

                if (!unusedDiag) {
                    break; // No more unused variables to process
                }

                const start = unusedDiag.start!;
                const len = unusedDiag.length!;
                const codeFixes = languageService.getCodeFixesAtPosition(
                    fileName,
                    start,
                    start + len,
                    [unusedDiag.code],
                    {},
                    {}
                );

                const removeAction = codeFixes.find(fix => 
                    fix.fixName === 'unusedIdentifier' || 
                    fix.description.toLowerCase().includes('remove') ||
                    fix.description.toLowerCase().includes('delete')
                ) || codeFixes[0];

                if (removeAction && removeAction.changes) {
                    let applied = false;
                    for (const change of removeAction.changes) {
                        if (change.fileName === fileName && change.textChanges.length > 0) {
                            content = applyTextChanges(content, change.textChanges);
                            setFileContent(fileName, content);
                            modified = true;
                            applied = true;
                            totalFixedVariables++;
                        }
                    }
                    if (!applied) {
                        break;
                    }
                } else {
                    break;
                }

                iteration++;
            }

            if (iteration >= maxIterations) {
                console.warn(`⚠️ Warning: Reached max refactoring iterations for ${relativeName}`);
            }

        } catch (e) {
            console.error(`❌ Failed to clean unused variables in ${relativeName}:`, e);
        }

        // Write the refactored code back to disk only if modified
        if (modified) {
            fs.writeFileSync(fileName, content, 'utf8');
            totalFilesModified++;
            console.log(`💾 Saved cleaned file: ${relativeName}`);
        }
    }

    console.log(`\n🎉 Refactoring Complete!`);
    console.log(`📁 Files modified: ${totalFilesModified}`);
    console.log(`🗑️  Unused declarations removed: ${totalFixedVariables}`);
}

function isParameterAtPosition(node: ts.Node, pos: number): boolean {
    if (pos < node.getStart() || pos >= node.getEnd()) {
        return false;
    }
    if (node.kind === ts.SyntaxKind.Parameter) {
        return true;
    }
    return ts.forEachChild(node, child => isParameterAtPosition(child, pos)) ?? false;
}

function applyTextChanges(content: string, changes: readonly ts.TextChange[]): string {
    // Sort text changes in descending start order so indices don't shift when applying edits
    const sortedChanges = [...changes].sort((a, b) => b.span.start - a.span.start);
    let result = content;
    for (const change of sortedChanges) {
        const start = change.span.start;
        const length = change.span.length;
        const newText = change.newText;
        result = result.substring(0, start) + newText + result.substring(start + length);
    }
    return result;
}

main();
