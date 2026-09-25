import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import AppIcon from './ui/AppIcons';
import { useTranslation } from 'react-i18next';
import { createImageUploader, getSafeImageUrl, validateImageFile } from './imageUploadUtils.js';

/**
 * Composant réutilisable pour l'upload d'images
 * Props :
 *   - type : "photo-profil" | "activite" | "projet"
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
  size = 100,
  disabled = false,
  onUploadingChange,
}) {
  const { t } = useTranslation();
  const allowedOrigins = [
    window.location.origin,
    new URL(api.defaults.baseURL, window.location.origin).origin,
  ];
  const safeCurrentUrl = getSafeImageUrl(currentUrl, { allowedOrigins });
  const [preview, setPreview] = useState(safeCurrentUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [uploadImage] = useState(() => createImageUploader({ apiClient: api, allowedOrigins }));

  useEffect(() => {
    setPreview(safeCurrentUrl);
  }, [safeCurrentUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(t(`upload.${validationError}`));
      return;
    }

    setError('');
    setLoading(true);
    onUploadingChange?.(true);

    // URL locale générée par le navigateur pour l'aperçu immédiat.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const safeUploadedUrl = await uploadImage(file, type);

      setPreview(safeUploadedUrl);

      if (onUploadSuccess) {
        onUploadSuccess(safeUploadedUrl);
      }
    } catch (err) {
      setError(t(`upload.${err.code || 'error'}`));
      setPreview(safeCurrentUrl);
    } finally {
      URL.revokeObjectURL(localUrl);
      setLoading(false);
      onUploadingChange?.(false);
      e.target.value = '';
    }
  };

  const containerStyle =
    shape === 'circle'
      ? {
          width: `${size}px`,
          height: `${size}px`,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Zone de prévisualisation cliquable */}
      <button
        type="button"
        style={{ ...containerStyle, padding: 0 }}
        onClick={() => !disabled && !loading && fileInputRef.current?.click()}
        disabled={disabled || loading}
        aria-label={label}
      >
        {preview ? (
          <img
            src={preview}
            alt={t('upload.photoPreview')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span
            style={{
              color: '#4A6A8A',
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '8px',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppIcon name="Camera" className="h-5 w-5" />
            {t('upload.clickToAdd')}
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
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AppIcon name="Clock" className="h-4 w-4" />
              {t('upload.uploading')}
            </span>
          </div>
        )}
      </button>

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || loading}
      />

      {/* Bouton texte */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || loading}
        style={{
          background: 'none',
          border: 'none',
          color: '#2E86AB',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          fontSize: '0.85rem',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        {loading ? t('upload.uploading') : label}
      </button>

      {/* Message d'erreur */}
      {error && (
        <p
          style={{
            color: '#e74c3c',
            fontSize: '0.8rem',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
