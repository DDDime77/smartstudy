'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export default function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  const isTerms = type === 'terms';

  const termsContent = (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-foreground">Terms of Service</h3>

      <p className="text-muted-foreground">
        By using StudySmart, you agree to the following terms and conditions:
      </p>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium mb-1">1. Data Processing</h4>
          <p className="text-muted-foreground">
            We process your user data to personalize and maximize your learning experience. This includes
            analyzing your study patterns, academic performance, and learning preferences to provide
            tailored recommendations and insights.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">2. AI-Powered Features</h4>
          <p className="text-muted-foreground">
            Our platform uses artificial intelligence to analyze your study habits, predict optimal study
            times, estimate task completion times, and generate personalized study plans based on your
            academic goals and performance metrics.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">3. Academic Information Storage</h4>
          <p className="text-muted-foreground">
            We securely store your academic information, including subjects, grades, assignments, and
            progress data to track your educational journey and provide comprehensive progress reports.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">4. Notifications and Insights</h4>
          <p className="text-muted-foreground">
            You will receive notifications and insights based on your study habits, upcoming deadlines,
            and performance trends. These communications are designed to help you stay on track with
            your academic goals.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">5. Data Improvement</h4>
          <p className="text-muted-foreground">
            We may use anonymized and aggregated data to improve our platform's features, algorithms,
            and overall user experience. Your personal information is never shared with third parties
            for commercial purposes.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">6. User Responsibilities</h4>
          <p className="text-muted-foreground">
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account. Please notify us immediately of any unauthorized
            use of your account.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          We are committed to protecting your privacy and will never sell your personal information to
          third parties. For more details, please review our Privacy Policy.
        </p>
      </div>
    </div>
  );

  const privacyContent = (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold text-foreground">Privacy Policy</h3>

      <p className="text-muted-foreground">
        Your privacy is important to us. This policy explains how we collect, use, and protect your data.
      </p>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium mb-1">Data Collection</h4>
          <p className="text-muted-foreground">
            We collect information you provide directly to us, including your name, email address,
            educational details, study preferences, and academic performance data.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">How We Use Your Data</h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Personalize study recommendations based on your learning style</li>
            <li>Track academic progress and generate performance insights</li>
            <li>Optimize time management through intelligent scheduling</li>
            <li>Provide predictive analytics for study planning</li>
            <li>Generate customized progress reports and analytics</li>
            <li>Improve learning outcomes through data-driven recommendations</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-1">Data Security</h4>
          <p className="text-muted-foreground">
            We use industry-standard encryption and security measures to protect your information. Your
            data is stored on secure servers with restricted access and regular security audits.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">Data Sharing</h4>
          <p className="text-muted-foreground">
            We do not sell, trade, or rent your personal information to third parties. We may share
            anonymized, aggregated data for research purposes or to improve educational outcomes.
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-1">Your Rights</h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Access your personal data at any time</li>
            <li>Request correction of inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data in a portable format</li>
            <li>Opt-out of certain data processing activities</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-1">Cookies and Tracking</h4>
          <p className="text-muted-foreground">
            We use cookies and similar technologies to enhance your experience, remember your preferences,
            and analyze platform usage. You can manage cookie preferences in your browser settings.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}. We may update this policy periodically.
          Continued use of our service constitutes acceptance of any changes.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </DialogTitle>
          <DialogDescription>
            Please read {isTerms ? 'our terms of service' : 'our privacy policy'} carefully
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4">
          {isTerms ? termsContent : privacyContent}
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}