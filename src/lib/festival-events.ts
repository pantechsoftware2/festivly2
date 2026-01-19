/**
 * Festival Events Configuration
 * Indian festivals and events for image generation
 */

export interface FestivalEvent {
  id: string
  name: string
  date: string // YYYY-MM-DD format
  month: string
  industry?: string[] // Industries this event applies to
  description: string
  imagePromptHint: string
}

export const FESTIVAL_EVENTS: FestivalEvent[] = [
  {
    id: 'republic-day',
    name: 'Republic Day',
    date: '2026-01-26',
    month: 'January',
    description: 'Celebrate India\'s Republic Day with patriotic designs',
    imagePromptHint: 'Indian flag, tricolor, patriotic, national pride'
  },
  {
    id: 'holi',
    name: 'Holi (Festival of Colors)',
    date: '2026-03-15',
    month: 'March',
    description: 'Colorful and joyful designs for the festival of colors',
    imagePromptHint: 'vibrant colors, celebration, joy, spring, colored powder'
  },
  {
    id: 'mahavir-jayanti',
    name: 'Mahavir Jayanti',
    date: '2026-04-02',
    month: 'April',
    description: 'Honor the birth of Mahavira with spiritual designs',
    imagePromptHint: 'spiritual, peaceful, non-violence, Jainism'
  },
  {
    id: 'ram-navami',
    name: 'Ram Navami',
    date: '2026-04-10',
    month: 'April',
    description: 'Celebrate Lord Ram\'s birthday with divine designs',
    imagePromptHint: 'divine, spiritual, Hindu, celebration, gold, sacred'
  },
  {
    id: 'buddha-purnima',
    name: 'Buddha Purnima',
    date: '2026-05-05',
    month: 'May',
    description: 'Honor Buddha\'s enlightenment with serene designs',
    imagePromptHint: 'serene, peaceful, enlightenment, Buddha, meditation'
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    date: '2026-08-15',
    month: 'August',
    description: 'Celebrate India\'s independence with patriotic themes',
    imagePromptHint: 'Indian flag, independence, freedom, national'
  },
  {
    id: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    date: '2026-09-07',
    month: 'September',
    description: 'Welcome Ganesh with colorful and auspicious designs',
    imagePromptHint: 'Ganesh, Hindu, celebration, auspicious, gold'
  },
  {
    id: 'durga-puja',
    name: 'Durga Puja',
    date: '2026-10-08',
    month: 'October',
    description: 'Celebrate the festival of Durga with divine designs',
    imagePromptHint: 'Durga, Hindu, celebration, divine, power'
  },
  {
    id: 'diwali',
    name: 'Diwali (Festival of Lights)',
    date: '2026-11-01',
    month: 'November',
    description: 'Illuminate your brand with Diwali\'s festive spirit',
    imagePromptHint: 'lights, lamps, gold, celebration, fireworks, prosperity'
  },
  {
    id: 'christmas',
    name: 'Christmas',
    date: '2026-12-25',
    month: 'December',
    description: 'Spread joy and festive cheer with Christmas designs',
    imagePromptHint: 'Christmas, festive, joy, celebration, lights, red green gold'
  }
]

/**
 * Get upcoming events (next 30 days from today)
 */
export function getUpcomingEvents(daysAhead: number = 30): FestivalEvent[] {
  const today = new Date()
  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  return FESTIVAL_EVENTS.filter(event => {
    const eventDate = new Date(event.date + 'T00:00:00')
    return eventDate >= today && eventDate <= futureDate
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Get all events sorted by date
 */
export function getAllEvents(): FestivalEvent[] {
  return [...FESTIVAL_EVENTS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Get event by ID
 */
export function getEventById(id: string): FestivalEvent | undefined {
  return FESTIVAL_EVENTS.find(event => event.id === id)
}
