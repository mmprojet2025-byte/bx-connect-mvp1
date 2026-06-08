import groupsIllustration from '../assets/illustrations/groups.png'

export default function GroupCover({
  title = '',
  className = 'h-44',
  imageClassName = '',
}) {
  return (
    <img
      src={groupsIllustration}
      alt={title}
      className={`w-full ${className} object-cover ${imageClassName}`}
    />
  )
}
