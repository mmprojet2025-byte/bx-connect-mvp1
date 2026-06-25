import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/axios'

export default function useGroupMessaging({ t }) {
  const [groupe, setGroupe] = useState(null)
  const [fil, setFil] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [emptyState, setEmptyState] = useState('')
  const [error, setError] = useState('')
  const lastLoadedThreadRef = useRef(null)

  const fetchMessages = useCallback(async (filId) => {
    setLoadingMessages(true)
    setError('')
    try {
      const res = await api.get(`/messagerie/fils/${filId}/messages`)
      setMessages(res.data)
      lastLoadedThreadRef.current = filId
    } catch (err) {
      setError(getAccessError(err, t))
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [t])

  const fetchMessagerie = useCallback(async () => {
    setLoading(true)
    setError('')
    setEmptyState('')
    try {
      const groupeRes = await api.get('/messagerie/mon-groupe')
      setGroupe(groupeRes.data)

      const filRes = await api.get(`/messagerie/groupes/${groupeRes.data.id}/fil`)
      setFil(filRes.data)
      await fetchMessages(filRes.data.id)
    } catch (err) {
      setGroupe(null)
      setFil(null)
      setMessages([])
      if (err.response?.status === 403) {
        setEmptyState(t('messaging.noGroup'))
      } else {
        setError(getAccessError(err, t))
      }
    } finally {
      setLoading(false)
    }
  }, [fetchMessages, t])

  useEffect(() => { fetchMessagerie() }, [fetchMessagerie])

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || !groupe || !fil) return false
    setError('')
    try {
      await api.post(`/messagerie/groupes/${groupe.id}/messages`, {
        contenu: content.trim(),
        filId: fil.id,
      })
      await fetchMessages(fil.id)
      return true
    } catch (err) {
      setError(getAccessError(err, t))
      throw err
    }
  }, [fetchMessages, fil, groupe, t])

  return {
    emptyState,
    error,
    fil,
    groupe,
    loading,
    loadingMessages,
    messages,
    refresh: fetchMessagerie,
    refreshMessages: fetchMessages,
    sendMessage,
    setError,
    lastLoadedThreadRef,
  }
}

function getAccessError(err, t) {
  return err.response?.status === 403
    ? t('messaging.accessDenied')
    : t('messaging.errorMessaging')
}
