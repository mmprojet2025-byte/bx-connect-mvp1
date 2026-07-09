import api from './axios'

const DEFAULT_PAGE = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  last: true,
}

export async function getNotificationsPage(page = 0, size = 20) {
  const res = await api.get('/notifications/page', { params: { page, size } })
  return normalizePagedResponse(res.data, page, size)
}

export async function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/lue`)
}

export async function markAllNotificationsRead() {
  return api.patch('/notifications/toutes-lues')
}

export async function deleteNotification(id) {
  return api.delete(`/notifications/${id}`)
}

export async function getUnreadCount() {
  const res = await api.get('/notifications/count')
  return res.data?.nonLues || 0
}

function normalizePagedResponse(data, page, size) {
  if (Array.isArray(data)) {
    return {
      content: data,
      page,
      size,
      totalElements: data.length,
      totalPages: data.length > 0 ? 1 : 0,
      last: true,
    }
  }

  return {
    ...DEFAULT_PAGE,
    ...data,
    content: Array.isArray(data?.content) ? data.content : [],
    page: Number.isFinite(data?.page) ? data.page : page,
    size: Number.isFinite(data?.size) ? data.size : size,
    totalElements: Number.isFinite(data?.totalElements) ? data.totalElements : DEFAULT_PAGE.totalElements,
    totalPages: Number.isFinite(data?.totalPages) ? data.totalPages : DEFAULT_PAGE.totalPages,
    last: typeof data?.last === 'boolean' ? data.last : DEFAULT_PAGE.last,
  }
}
