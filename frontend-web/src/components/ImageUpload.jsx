import { useState, useRef } from 'react';
import api from '../api/axios';
import { userFriendlyError } from '../utils/userFriendlyError';

/**
 * Composant réutilisable pour l'upload d'images
 * Props :
 *   - type : "avatar" | "activite" | "projet"
 *   - currentUrl : URL de l'image actuelle (optionnel)
 *   - onUploadSuccess : callback(url) appelé après upload réussi
 *   - shape : "circle" | "rectangle" (défaut: "rectangle")
 *   - label : texte du bouton (optionnel)
 */
export default function ImageUpload({
  type = 'general',
  currentUrl = null,
  onUploadSuccess,
  shape = 'rectangle',
  label = 'Changer l\'image',
}) {
  const [preview, setPreview] = useState(currentUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Type non autorisé. Utilisez JPEG, PNG, WEBP ou GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 5 Mo).');
      return;
    }

    setError('');
    setLoading(true);

    // Prévisualisation locale immédiate
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Upload vers le backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { url } = response.data;
      setPreview(url);
      if (onUploadSuccess) onUploadSuccess(url);
    } catch (err) {
      setError(userFriendlyError(err, 'Action impossible.'));
      setPreview(currentUrl); // Revenir à l'image précédente
    } finally {
      setLoading(false);
    }
  };

  const containerStyle =
    shape === 'circle'
      ? {
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #2E86AB',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E2EAF0',
        }
      : {
          width: '100%',
          height: '180px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px dashed #2E86AB',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E2EAF0',
        };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Zone de prévisualisation cliquable */}
      <div style={containerStyle} onClick={() => fileInputRef.current?.click()}>
        {preview ? (
          <img
            src={preview}
            alt="Aperçu"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: '#4A6A8A', fontSize: '0.85rem', textAlign: 'center', padding: '8px' }}>
            📷 Cliquer pour ajouter une image
          </span>
        )}

        {/* Overlay de chargement */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.85rem',
            }}
          >
            ⏳ Upload...
          </div>
        )}
      </div>

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Bouton texte */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        style={{
          background: 'none',
          border: 'none',
          color: '#2E86AB',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        {loading ? 'Upload en cours...' : label}
      </button>

      {/* Message d'erreur */}
      {error && (
        <p style={{ color: '#e74c3c', fontSize: '0.8rem', margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
