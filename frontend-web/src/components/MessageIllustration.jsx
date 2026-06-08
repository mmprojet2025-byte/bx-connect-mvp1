import messagesIllustration from '../assets/illustrations/messages.png'

export default function MessageIllustration({
  alt = '',
  className = 'h-48 w-48',
}) {
  return (
    <img
      src={messagesIllustration}
      alt={alt}
      className={`${className} object-contain`}
    />
  )
}
