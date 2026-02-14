'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { FiSun, FiMoon, FiLock, FiSend, FiCheckCircle, FiX } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

export default function StaffApplication() {
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [closedMessage, setClosedMessage] = useState('');
  const [agreedToTOS, setAgreedToTOS] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    discordUsername: '',
    discordUserId: '',
    country: '',
    timezone: '',
    age: '',
    aboutYourself: '',
    whyJoin: '',
    hoursPerWeek: '',
    languages: '',
    vcAvailability: '',
    vcFrequency: '',
    moderationExperience: '',
    moderatorDefinition: '',
    leadershipExperience: '',
    discordBotExperience: '',
    automodKnowledge: '',
    moderationBotsFamiliarity: '',
    modCommandsKnowledge: '',
  });

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success && result.data) {
        setIsApplicationsOpen(result.data.isOpen);
        setClosedMessage(result.data.closedMessage || 'Staff applications are currently closed. Please check back later.');
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowSuccessModal(true);
        setFormData({
          discordUsername: '',
          discordUserId: '',
          country: '',
          timezone: '',
          age: '',
          aboutYourself: '',
          whyJoin: '',
          hoursPerWeek: '',
          languages: '',
          vcAvailability: '',
          vcFrequency: '',
          moderationExperience: '',
          moderatorDefinition: '',
          leadershipExperience: '',
          discordBotExperience: '',
          automodKnowledge: '',
          moderationBotsFamiliarity: '',
          modCommandsKnowledge: '',
        });
      } else {
        const errorData = await response.json();
        console.error('Submission error:', errorData);
        alert('Failed to submit application. Please check all fields and try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToForm = () => {
    if (agreedToTOS) {
      setShowForm(true);
    } else {
      alert('Please agree to the Terms of Service before continuing.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[rgb(var(--color-accent))] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] apple-transition relative overflow-hidden">
      {/* Animated Blue Background - Light mode only */}
      {theme === 'light' && (
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
      )}

      {/* Navigation with Logo */}
      <nav className="sticky top-0 z-50 glass-blue border-b border-blue-500/20 dark:border-white/10 shadow-apple-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 apple-hover">
              <div className="relative w-10 h-10">
                <Image
                  src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                  alt="Omegle Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Omeglee Community</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] apple-hover border border-[rgb(var(--color-border))] hover:shadow-blue-glow"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <FiSun className="w-5 h-5 text-white" />
              ) : (
                <FiMoon className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-blue-glow max-w-md mx-4 animate-scale-in">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <FiCheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-[rgb(var(--color-text-primary))]">
                    Application Submitted!
                  </h2>
                  <div className="space-y-2 text-[rgb(var(--color-text-secondary))]">
                    <p className="text-lg">
                      Thank you for applying to join our staff team.
                    </p>
                    <p className="font-medium">
                      If you are shortlisted, you will be contacted within 2 weeks.
                    </p>
                    <p className="text-sm text-[rgb(var(--color-text-tertiary))]">
                      Note: We do not send rejection notifications.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowForm(false);
                    setAgreedToTOS(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-6 py-3 rounded-2xl apple-transition hover:shadow-blue-glow"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {!isApplicationsOpen ? (
          // Closed State - Apple Style
          <div className="text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80 animate-float">
                <Image
                  src="/Resume folder-bro.svg"
                  alt="Applications Closed"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))]">
                <FiLock className="w-8 h-8 text-[rgb(var(--color-text-secondary))]" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                Applications Closed
              </h1>
              <p className="text-xl text-[rgb(var(--color-text-secondary))] max-w-2xl mx-auto font-light leading-relaxed">
                {closedMessage}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold px-8 py-4 rounded-2xl apple-transition shadow-apple-md hover:shadow-blue-glow mt-4"
              >
                Return Home
              </Link>
            </div>
          </div>
        ) : !showForm ? (
          // Terms of Service Section
          <div className="animate-fade-in space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                Staff Application
              </h1>
              <p className="text-xl text-[rgb(var(--color-text-secondary))] max-w-2xl mx-auto font-light">
                Please read and agree to our terms before proceeding
              </p>
            </div>

            <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
              <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Terms of Service</h2>
              
              <div className="space-y-4 text-[rgb(var(--color-text-secondary))] max-h-96 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">1. Staff Expectations</h3>
                  <p className="text-sm leading-relaxed">
                    By applying, you agree to dedicate time to moderation duties, follow server rules, and maintain professionalism at all times. Staff members are expected to be active, responsive, and fair in their decisions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">2. Confidentiality</h3>
                  <p className="text-sm leading-relaxed">
                    All internal discussions, staff channels, and moderation decisions are confidential. Sharing private information or screenshots from staff channels is strictly prohibited.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">3. Code of Conduct</h3>
                  <p className="text-sm leading-relaxed">
                    Staff must maintain a positive attitude, treat community members with respect, and uphold the server's values. Abuse of power, harassment, or discrimination will result in immediate removal.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">4. Activity Requirements</h3>
                  <p className="text-sm leading-relaxed">
                    Staff members are expected to maintain consistent activity. Prolonged inactivity without notice may result in removal from the team.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">5. Application Process</h3>
                  <p className="text-sm leading-relaxed">
                    All information provided in this application must be truthful and accurate. False information may lead to immediate disqualification. If shortlisted, you will be contacted within 2 weeks. We do not send rejection notifications.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">6. Resignation</h3>
                  <p className="text-sm leading-relaxed">
                    Staff members may resign at any time by notifying the admin team. We ask for at least 1 week notice when possible to ensure smooth transitions.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-[rgb(var(--color-border))] space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTOS}
                    onChange={(e) => setAgreedToTOS(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] checked:bg-blue-600 dark:checked:bg-white checked:border-blue-600 dark:checked:border-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-white apple-transition cursor-pointer"
                  />
                  <span className="text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-text-primary))] apple-transition">
                    I have read and agree to the Terms of Service
                  </span>
                </label>

                <button
                  onClick={handleContinueToForm}
                  disabled={!agreedToTOS}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed font-semibold px-8 py-4 rounded-2xl apple-transition shadow-apple-md hover:shadow-blue-glow text-lg"
                >
                  Continue to Application
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Application Form - Apple Style
          <>
            {/* Header */}
            <div className="text-center space-y-6 mb-16 animate-fade-in">
              <div className="flex justify-center">
                <div className="relative w-48 h-48 md:w-64 md:h-64 animate-float">
                  <Image
                    src="/Forms-cuate.svg"
                    alt="Staff Application"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
                  Staff Application
                </h1>
                <p className="text-xl text-[rgb(var(--color-text-secondary))] max-w-2xl mx-auto font-light leading-relaxed">
                  Join our team and help build an amazing community experience.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
              {/* Discord Information */}
              <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Discord Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Discord Username
                    </label>
                    <input
                      type="text"
                      name="discordUsername"
                      value={formData.discordUsername}
                      onChange={handleChange}
                      placeholder="iambyte"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Discord User ID
                    </label>
                    <input
                      type="text"
                      name="discordUserId"
                      value={formData.discordUserId}
                      onChange={handleChange}
                      placeholder="929297205796417597"
                      pattern="^\d{17,19}$"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="INDIA"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Timezone
                    </label>
                    <input
                      type="text"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      placeholder="IST"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="18"
                      min="16"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>
                </div>
              </div>

              {/* General Questions */}
              <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">General Questions</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Tell us about yourself
                    </label>
                    <textarea
                      name="aboutYourself"
                      value={formData.aboutYourself}
                      onChange={handleChange}
                      placeholder="Your background, interests, hobbies, and what makes you unique..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Why do you want to join our staff team?
                    </label>
                    <textarea
                      name="whyJoin"
                      value={formData.whyJoin}
                      onChange={handleChange}
                      placeholder="Share your motivation and what you hope to contribute..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      How many hours per week can you dedicate to moderation?
                    </label>
                    <input
                      type="text"
                      name="hoursPerWeek"
                      value={formData.hoursPerWeek}
                      onChange={handleChange}
                      placeholder="10-15 hours"
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      What languages do you speak fluently?
                    </label>
                    <input
                      type="text"
                      name="languages"
                      value={formData.languages}
                      onChange={handleChange}
                      placeholder="English, Hindi, etc."
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Are you able to connect in VC regularly?
                    </label>
                    <select
                      name="vcAvailability"
                      value={formData.vcAvailability}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    >
                      <option value="">Select an option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="listen">Yes, but can listen</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      If yes, how often can you connect?
                    </label>
                    <input
                      type="text"
                      name="vcFrequency"
                      value={formData.vcFrequency}
                      onChange={handleChange}
                      placeholder="e.g., Daily, 3-4 times a week, etc."
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition"
                    />
                  </div>
                </div>
              </div>

              {/* Moderation Questions */}
              <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Moderation Experience</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Do you have any previous moderation experience?
                    </label>
                    <textarea
                      name="moderationExperience"
                      value={formData.moderationExperience}
                      onChange={handleChange}
                      placeholder="Describe your previous moderation roles, communities, and responsibilities..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      What does being a good moderator mean to you?
                    </label>
                    <textarea
                      name="moderatorDefinition"
                      value={formData.moderatorDefinition}
                      onChange={handleChange}
                      placeholder="Define what qualities and responsibilities make an effective moderator..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Do you have any experience in leadership?
                    </label>
                    <textarea
                      name="leadershipExperience"
                      value={formData.leadershipExperience}
                      onChange={handleChange}
                      placeholder="Describe your leadership experience, responsibilities, and how you've handled team situations..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bot & Discord Experience */}
              <div className="glass-blue rounded-3xl p-8 border border-blue-500/20 shadow-apple-md hover:shadow-blue-glow apple-transition space-y-6">
                <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">Discord Bot Experience</h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      What is your experience with Discord bots? (Rate 1-5)
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label 
                          key={rating} 
                          className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer apple-transition ${
                            formData.discordBotExperience === rating.toString()
                              ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] text-[rgb(var(--color-text-secondary))] hover:border-blue-500/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="discordBotExperience"
                            value={rating.toString()}
                            checked={formData.discordBotExperience === rating.toString()}
                            onChange={handleChange}
                            required
                            className="sr-only"
                          />
                          <span className="text-lg font-semibold">{rating}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                      1 = No experience | 5 = Expert
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      How much do you know about AutoMod?
                    </label>
                    <textarea
                      name="automodKnowledge"
                      value={formData.automodKnowledge}
                      onChange={handleChange}
                      placeholder="Describe your knowledge of Discord's AutoMod feature, rules you've set up, experience with filters..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      Which moderation bots are you familiar with?
                    </label>
                    <textarea
                      name="moderationBotsFamiliarity"
                      value={formData.moderationBotsFamiliarity}
                      onChange={handleChange}
                      placeholder="MEE6, Dyno, Carl-bot, ProBot, Wick, etc. Describe which ones you've used and for what purpose..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))]">
                      What moderation commands are you familiar with?
                    </label>
                    <textarea
                      name="modCommandsKnowledge"
                      value={formData.modCommandsKnowledge}
                      onChange={handleChange}
                      placeholder="Ban, kick, mute, timeout, warn, slowmode, lockdown, etc. Explain your experience using these commands..."
                      rows={4}
                      required
                      className="w-full px-4 py-3.5 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-apple text-[rgb(var(--color-text-primary))] placeholder-[rgb(var(--color-text-tertiary))] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 apple-transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black disabled:opacity-50 font-semibold px-8 py-5 rounded-2xl apple-transition shadow-apple-lg hover:shadow-blue-glow text-lg disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-black border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--color-border))] mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-[rgb(var(--color-text-tertiary))] font-light space-y-2">
            <p>© 2026 Omeglee. All rights reserved.</p>
            <a href="https://discord.gg/omegle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[rgb(var(--color-text-secondary))] apple-transition">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
