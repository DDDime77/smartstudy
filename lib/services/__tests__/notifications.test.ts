import { NotificationService } from '../notifications';
import type { AIAssignment } from '@/lib/api/assignments';

describe('NotificationService', () => {
  beforeEach(() => {
    NotificationService.clearShownNotifications();
  });

  describe('shouldShowNotification', () => {
    it('should return true when assignment is 60 minutes away', () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);
      const [hours, minutes] = [scheduledTime.getHours(), scheduledTime.getMinutes()];

      const assignment: AIAssignment = {
        id: 'test-1',
        user_id: 'user-1',
        title: 'Test Assignment',
        topic: 'Math',
        difficulty: 'medium',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        estimated_minutes: 60,
        required_tasks_count: 5,
        status: 'pending',
        tasks_completed: 0,
        time_spent_minutes: 0,
        progress_percentage: 0,
        created_by_ai: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      expect(NotificationService.shouldShowNotification(assignment)).toBe(true);
    });

    it('should return false when assignment is more than 60 minutes away', () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 90 * 60 * 1000);
      const [hours, minutes] = [scheduledTime.getHours(), scheduledTime.getMinutes()];

      const assignment: AIAssignment = {
        id: 'test-2',
        user_id: 'user-1',
        title: 'Test Assignment',
        topic: 'Math',
        difficulty: 'medium',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        estimated_minutes: 60,
        required_tasks_count: 5,
        status: 'pending',
        tasks_completed: 0,
        time_spent_minutes: 0,
        progress_percentage: 0,
        created_by_ai: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      expect(NotificationService.shouldShowNotification(assignment)).toBe(false);
    });

    it('should return false when assignment has already passed', () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() - 10 * 60 * 1000);
      const [hours, minutes] = [scheduledTime.getHours(), scheduledTime.getMinutes()];

      const assignment: AIAssignment = {
        id: 'test-3',
        user_id: 'user-1',
        title: 'Test Assignment',
        topic: 'Math',
        difficulty: 'medium',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        estimated_minutes: 60,
        required_tasks_count: 5,
        status: 'pending',
        tasks_completed: 0,
        time_spent_minutes: 0,
        progress_percentage: 0,
        created_by_ai: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      expect(NotificationService.shouldShowNotification(assignment)).toBe(false);
    });

    it('should not show same notification twice', () => {
      const now = new Date();
      const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);
      const [hours, minutes] = [scheduledTime.getHours(), scheduledTime.getMinutes()];

      const assignment: AIAssignment = {
        id: 'test-4',
        user_id: 'user-1',
        title: 'Test Assignment',
        topic: 'Math',
        difficulty: 'medium',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        estimated_minutes: 60,
        required_tasks_count: 5,
        status: 'pending',
        tasks_completed: 0,
        time_spent_minutes: 0,
        progress_percentage: 0,
        created_by_ai: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      expect(NotificationService.shouldShowNotification(assignment)).toBe(true);

      NotificationService.markAsShown(assignment.id, assignment.scheduled_date);

      expect(NotificationService.shouldShowNotification(assignment)).toBe(false);
    });
  });

  describe('createNotificationMessage', () => {
    it('should create correct notification message', () => {
      const now = new Date();
      const assignment: AIAssignment = {
        id: 'test-5',
        user_id: 'user-1',
        title: 'Test Assignment',
        subject_name: 'Physics',
        topic: 'Newton\'s Laws',
        difficulty: 'medium',
        scheduled_date: now.toISOString().split('T')[0],
        scheduled_time: '14:30',
        estimated_minutes: 60,
        required_tasks_count: 5,
        status: 'pending',
        tasks_completed: 0,
        time_spent_minutes: 0,
        progress_percentage: 0,
        created_by_ai: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const notification = NotificationService.createNotificationMessage(assignment);

      expect(notification.title).toBe('Study Session Starting Soon');
      expect(notification.subject).toBe('Physics');
      expect(notification.scheduledTime).toBe('14:30');
      expect(notification.message).toContain('Physics');
      expect(notification.message).toContain('Newton\'s Laws');
      expect(notification.message).toContain('14:30');
    });
  });
});
