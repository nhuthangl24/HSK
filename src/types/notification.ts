export type NotificationType =
  | 'system'
  | 'exam'
  | 'reminder'
  | 'achievement'
  | 'update'
  | 'feature'
  | 'maintenance';

export type NotificationPriority = 'low' | 'normal' | 'urgent' | 'high';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isPinned?: boolean;
  actionLabel?: string;
  actionLink?: string;
  actionType?: 'open_exams' | 'open_srs' | 'open_worksheet' | 'link';
  actionPayload?: string;
  createdAt: string;
}
