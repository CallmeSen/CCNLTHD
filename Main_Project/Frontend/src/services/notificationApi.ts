import { apiClient } from './apiClient'

export interface NotificationDto {
  id: string
  userId: string
  recipientEmail: string
  type: string
  subject: string
  status: string
  createdAt: string
  sentAt?: string
}

export const getMyNotifications = (): Promise<NotificationDto[]> =>
  apiClient.get<NotificationDto[]>('/notifications').then((r) => r.data)

export const getNotificationsByType = (type: string): Promise<NotificationDto[]> =>
  apiClient.get<NotificationDto[]>(`/notifications/type/${type}`).then((r) => r.data)
