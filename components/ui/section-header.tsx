import { Badge } from "@/components/ui/badge"

interface SectionHeaderProps {
  icon: string
  title: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  accent?: 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'gray'
  animate?: boolean
}

export function SectionHeader({
  icon,
  title,
  badge,
  badgeVariant = 'default',
  accent = 'gray',
  animate = false
}: SectionHeaderProps) {
  const accentColors = {
    purple: 'border-purple-200 dark:border-purple-800',
    blue: 'border-blue-200 dark:border-blue-800',
    green: 'border-green-200 dark:border-green-800',
    red: 'border-red-200 dark:border-red-800',
    orange: 'border-orange-200 dark:border-orange-800',
    gray: 'border-gray-200 dark:border-gray-800'
  }

  return (
    <div className={`flex items-center gap-2 pb-2 border-b-2 ${accentColors[accent]}`}>
      <span className={`text-base sm:text-xl ${animate ? 'animate-pulse' : 'animate-float'}`}>
        {icon}
      </span>
      <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {badge && (
        <Badge variant={badgeVariant} className="text-[10px] sm:text-xs ml-2">
          {badge}
        </Badge>
      )}
    </div>
  )
}
