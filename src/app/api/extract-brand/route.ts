import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'

interface BrandData {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logo: string | null
  fonts: string[]
  palette: {
    hex: string[]
    name: string
  }
}

// Default tech palette as fallback
const DEFAULT_PALETTE: BrandData = {
  primaryColor: '#000000',
  secondaryColor: '#FFFFFF',
  accentColor: '#3B82F6',
  logo: null,
  fonts: ['Inter', 'Helvetica', 'Arial'],
  palette: {
    name: 'Tech',
    hex: ['#000000', '#FFFFFF', '#3B82F6', '#E5E7EB', '#6B7280'],
  },
}

// Common brand color mappings
const BRAND_COLORS: { [key: string]: BrandData } = {
  apple: {
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    accentColor: '#555555',
    logo: 'https://www.apple.com/favicon.ico',
    fonts: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont'],
    palette: {
      name: 'Apple',
      hex: ['#000000', '#FFFFFF', '#555555', '#F5F5F7', '#A2AAAD'],
    },
  },
  google: {
    primaryColor: '#4285F4',
    secondaryColor: '#FFFFFF',
    accentColor: '#EA4335',
    logo: 'https://www.google.com/favicon.ico',
    fonts: ['Roboto', 'Arial', 'sans-serif'],
    palette: {
      name: 'Google',
      hex: ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FFFFFF'],
    },
  },
  microsoft: {
    primaryColor: '#00A4EF',
    secondaryColor: '#FFFFFF',
    accentColor: '#7FBA00',
    logo: 'https://www.microsoft.com/favicon.ico',
    fonts: ['Segoe UI', 'Tahoma', 'sans-serif'],
    palette: {
      name: 'Microsoft',
      hex: ['#00A4EF', '#7FBA00', '#FFB900', '#F25022', '#FFFFFF'],
    },
  },
}

async function fetchAndParseHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 5000,
    } as any)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    return await response.text()
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

function extractBrandData(html: string, domain: string): BrandData {
  try {
    const $ = load(html)

    // Extract logo from multiple sources
    let logo = $('meta[property="og:image"]').attr('content')
    if (!logo) {
      logo = $('meta[name="twitter:image"]').attr('content')
    }
    if (!logo) {
      logo = $('link[rel="icon"]').attr('href')
    }
    if (!logo) {
      logo = $('link[rel="shortcut icon"]').attr('href')
    }
    // Make relative URLs absolute
    if (logo && !logo.startsWith('http')) {
      logo = logo.startsWith('//') ? `https:${logo}` : `https://${domain}${logo.startsWith('/') ? '' : '/'}${logo}`
    }
    if (!logo) {
      logo = `https://${domain}/favicon.ico`
    }

    // Extract fonts from style tags and linked stylesheets
    const fonts: Set<string> = new Set()
    $('style').each((i, elem) => {
      const styleContent = $(elem).html() || ''
      const fontMatches = styleContent.match(/font-family:\s*([^;]+)/g)
      if (fontMatches) {
        fontMatches.forEach((match) => {
          const font = match.replace('font-family:', '').trim().replace(/['"]/g, '')
          if (font && font !== 'inherit') {
            fonts.add(font.split(',')[0].trim())
          }
        })
      }
    })

    // Extract primary colors from CSS and inline styles
    const colors: string[] = []
    
    // Check style tags
    $('style').each((i, elem) => {
      const styleContent = $(elem).html() || ''
      const colorMatches = styleContent.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g)
      if (colorMatches) {
        colors.push(...colorMatches)
      }
    })

    // Check inline styles
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style') || ''
      const colorMatches = style.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g)
      if (colorMatches) {
        colors.push(...colorMatches)
      }
    })

    // Filter out common colors and get most frequent
    const colorCounts = new Map<string, number>()
    colors.forEach(color => {
      const normalized = color.toUpperCase()
      // Skip pure black, white, and very light grays
      if (normalized !== '#FFFFFF' && normalized !== '#000000' && normalized !== '#FFF' && normalized !== '#000') {
        colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1)
      }
    })

    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)

    let primaryColor = sortedColors[0] || '#000000'
    let secondaryColor = '#FFFFFF'
    let accentColor = sortedColors[1] || '#3B82F6'

    const fontArray = Array.from(fonts).slice(0, 3)
    if (fontArray.length === 0) {
      fontArray.push('system-ui', 'Arial', 'sans-serif')
    }

    return {
      primaryColor,
      secondaryColor,
      accentColor,
      logo: logo || null,
      fonts: fontArray,
      palette: {
        name: domain.toUpperCase(),
        hex: [primaryColor, secondaryColor, accentColor],
      },
    }
  } catch (error) {
    console.error('Parse error:', error)
    return DEFAULT_PALETTE
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Clean and normalize URL input
    let cleanUrl = url.trim().toLowerCase()
    
    // Remove common protocols if present
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '')
    
    // Remove www if present for domain matching
    let domain = cleanUrl.replace(/^www\./, '').split('/')[0]
    const domainKey = domain.split('.')[0].toLowerCase()

    console.log(`Processing URL: ${url} -> Domain: ${domain} -> Key: ${domainKey}`)

    // Check if we have predefined brand colors
    if (BRAND_COLORS[domainKey]) {
      console.log(`Found predefined colors for: ${domainKey}`)
      return NextResponse.json(BRAND_COLORS[domainKey])
    }

    // Normalize URL with https protocol
    let normalizedUrl = `https://${cleanUrl}`
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      normalizedUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`
    }

    // Ensure it has a protocol
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    console.log(`Extracting brand data from: ${normalizedUrl}`)

    // Fetch and parse HTML
    const html = await fetchAndParseHTML(normalizedUrl)
    const brandData = extractBrandData(html, domain)

    return NextResponse.json(brandData)
  } catch (error) {
    console.error('API error:', error)
    // Return default palette on error
    return NextResponse.json(DEFAULT_PALETTE)
  }
}