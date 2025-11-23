'use client'

import { useState, useEffect } from 'react'

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [chartHeight, setChartHeight] = useState(400)

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth

      setIsMobile(width < 640) // sm breakpoint
      setIsTablet(width >= 640 && width < 1024) // sm to lg
      setIsDesktop(width >= 1024) // lg+

      // Dynamic chart height based on screen size
      if (width < 640) {
        setChartHeight(250) // Mobile: smaller charts
      } else if (width < 1024) {
        setChartHeight(350) // Tablet: medium charts
      } else {
        setChartHeight(400) // Desktop: full height
      }
    }

    // Initial check
    updateScreenSize()

    // Listen for resize
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop,
    chartHeight,
  }
}
