import { getErrorMessage } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/apiAuth';
import dbConnect from '@/lib/mongodb';
import ApplicationSettings from '@/models/ApplicationSettings';
import { STAFF_ROLES, StaffRole } from '@/lib/staffApplicationForm';

type RoleFormSetting = {
  isOpen: boolean;
  closedMessage?: string;
};

type RoleFormSettingsMap = Record<StaffRole, RoleFormSetting>;

function getDefaultRoleForms(): RoleFormSettingsMap {
  return STAFF_ROLES.reduce((acc, role) => {
    acc[role.id] = { isOpen: true, closedMessage: '' };
    return acc;
  }, {} as RoleFormSettingsMap);
}

function normalizeRoleForms(input: any): RoleFormSettingsMap {
  const defaults = getDefaultRoleForms();
  if (!input || typeof input !== 'object') return defaults;

  for (const role of STAFF_ROLES) {
    const current = input[role.id];
    if (current && typeof current === 'object') {
      defaults[role.id] = {
        isOpen: typeof current.isOpen === 'boolean' ? current.isOpen : true,
        closedMessage: typeof current.closedMessage === 'string' ? current.closedMessage : '',
      };
    }
  }

  return defaults;
}

function mergeRoleForms(existing: any, updates: any): RoleFormSettingsMap {
  const normalizedExisting = normalizeRoleForms(existing);
  if (!updates || typeof updates !== 'object') return normalizedExisting;

  for (const role of STAFF_ROLES) {
    const roleUpdate = updates[role.id];
    if (!roleUpdate || typeof roleUpdate !== 'object') continue;

    normalizedExisting[role.id] = {
      isOpen:
        typeof roleUpdate.isOpen === 'boolean'
          ? roleUpdate.isOpen
          : normalizedExisting[role.id].isOpen,
      closedMessage:
        typeof roleUpdate.closedMessage === 'string'
          ? roleUpdate.closedMessage
          : normalizedExisting[role.id].closedMessage,
    };
  }

  return normalizedExisting;
}

export async function GET() {
  try {
    await dbConnect();
    
    let settings = await ApplicationSettings.findOne();
    
    
    if (!settings) {
      settings = await ApplicationSettings.create({
        isOpen: true,
        roleForms: getDefaultRoleForms(),
      });
    }

    const normalizedRoleForms = normalizeRoleForms(settings.roleForms);
    settings.roleForms = normalizedRoleForms;
    await settings.save();

    return NextResponse.json({ 
      success: true, 
      data: { 
        isOpen: settings.isOpen,
        closedMessage: settings.closedMessage,
        roleForms: normalizedRoleForms,
      } 
    });
  } catch (error: unknown) {
    console.error('GET /api/settings - Error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canAccessAdminFeatures(session.user?.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();

    let settings = await ApplicationSettings.findOne();
    const updates: Record<string, any> = {};

    if (typeof body.isOpen === 'boolean') {
      updates.isOpen = body.isOpen;
    }
    if (typeof body.closedMessage === 'string') {
      updates.closedMessage = body.closedMessage;
    }

    const existingRoleForms = settings?.roleForms || getDefaultRoleForms();
    updates.roleForms = mergeRoleForms(existingRoleForms, body.roleForms);
    
    if (!settings) {
      settings = await ApplicationSettings.create({
        isOpen: typeof updates.isOpen === 'boolean' ? updates.isOpen : true,
        closedMessage:
          typeof updates.closedMessage === 'string'
            ? updates.closedMessage
            : 'Staff applications are currently closed. Please check back later.',
        roleForms: updates.roleForms,
      });
    } else {
      settings = await ApplicationSettings.findOneAndUpdate(
        {},
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    const normalizedRoleForms = normalizeRoleForms(settings?.roleForms);

    return NextResponse.json({ 
      success: true, 
      data: { 
        isOpen: settings?.isOpen,
        closedMessage: settings?.closedMessage,
        roleForms: normalizedRoleForms,
      } 
    });
  } catch (error: unknown) {
    console.error('PATCH /api/settings - Error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
