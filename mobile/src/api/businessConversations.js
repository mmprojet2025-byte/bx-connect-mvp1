import api from './axios';

const businessConversationsApi = {
  list() {
    return api.get('/conversations-metier');
  },
  get(id) {
    return api.get(`/conversations-metier/${id}`);
  },
  getMessages(id) {
    return api.get(`/conversations-metier/${id}/messages`);
  },
  sendMessage(id, contenu) {
    return api.post(`/conversations-metier/${id}/messages`, { contenu });
  },
  markAsRead(id) {
    return api.patch(`/conversations-metier/${id}/lu`);
  },
};

export default businessConversationsApi;
