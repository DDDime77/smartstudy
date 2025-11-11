import { AIAssignment, AssignmentsService } from '@/lib/api/assignments';

export interface StudyNotification {
  id: string;
  assignmentId: string;
  title: string;
  subject: string;
  scheduledTime: string;
  message: string;
  shown: boolean;
}

export class NotificationService {
  private static readonly CHECK_INTERVAL = 60000; // Check every minute
  private static readonly REMINDER_MINUTES = 60; // Notify 1 hour before
  private static shownNotifications = new Set<string>();

  static async getUpcomingAssignments(): Promise<AIAssignment[]> {
    try {
      const allAssignments = await AssignmentsService.getAll();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      return allAssignments.filter(assignment => {
        if (assignment.status === 'completed' || assignment.status === 'cancelled') {
          return false;
        }

        return assignment.scheduled_date === todayStr;
      });
    } catch (error) {
      console.error('Failed to fetch assignments for notifications:', error);
      return [];
    }
  }

  static shouldShowNotification(assignment: AIAssignment): boolean {
    const notificationKey = `${assignment.id}-${assignment.scheduled_date}`;

    if (this.shownNotifications.has(notificationKey)) {
      return false;
    }

    if (!assignment.scheduled_time) {
      return false;
    }

    const now = new Date();
    const [hours, minutes] = assignment.scheduled_time.split(':').map(Number);

    const scheduledDateTime = new Date();
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const timeDiffMinutes = (scheduledDateTime.getTime() - now.getTime()) / 60000;

    return timeDiffMinutes > 0 && timeDiffMinutes <= this.REMINDER_MINUTES;
  }

  static markAsShown(assignmentId: string, scheduledDate: string): void {
    const notificationKey = `${assignmentId}-${scheduledDate}`;
    this.shownNotifications.add(notificationKey);
  }

  static createNotificationMessage(assignment: AIAssignment): StudyNotification {
    const subjectName = assignment.subject_name || 'Study';
    const topic = assignment.topic || assignment.title;
    const time = assignment.scheduled_time || 'soon';

    return {
      id: `${assignment.id}-${assignment.scheduled_date}`,
      assignmentId: assignment.id,
      title: `Study Session Starting Soon`,
      subject: subjectName,
      scheduledTime: time,
      message: `Your ${subjectName} study session on "${topic}" is starting at ${time}. Make sure to prepare!`,
      shown: false,
    };
  }

  static async checkForNotifications(): Promise<StudyNotification[]> {
    const upcomingAssignments = await this.getUpcomingAssignments();
    const notifications: StudyNotification[] = [];

    for (const assignment of upcomingAssignments) {
      if (this.shouldShowNotification(assignment)) {
        const notification = this.createNotificationMessage(assignment);
        notifications.push(notification);
        this.markAsShown(assignment.id, assignment.scheduled_date);
      }
    }

    return notifications;
  }

  static clearShownNotifications(): void {
    this.shownNotifications.clear();
  }
}
