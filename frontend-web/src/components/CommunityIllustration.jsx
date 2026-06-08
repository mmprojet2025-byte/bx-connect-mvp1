import communityIllustration from '../assets/illustrations/community.png'

export default function CommunityIllustration({
  alt = '',
  className = 'h-56 w-56',
}) {
  return (
    <img
      src={communityIllustration}
      alt={alt}
      className={`${className} object-contain`}
    />
  )
}
