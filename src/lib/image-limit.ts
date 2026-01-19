// Helper function to check if user has exceeded free image limit
export async function checkImageLimit(userId: string, supabase: any) {
  try {
    // Get user's current image count
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('free_images_generated, subscription_plan')
      .eq('id', userId)
      .single()

    if (error) throw error

    const subscription = profile?.subscription_plan || 'free'
    const imagesGenerated = profile?.free_images_generated || 0

    return {
      hasExceededLimit: subscription === 'free' && imagesGenerated >= 1,
      imagesGenerated,
      imagesRemaining: Math.max(0, 1 - imagesGenerated),
      subscription,
    }
  } catch (error: any) {
    console.error('Error checking image limit:', error)
    return {
      hasExceededLimit: false,
      imagesGenerated: 0,
      imagesRemaining: 1,
      subscription: 'free',
    }
  }
}

// Increment image generation count
export async function incrementImageCount(userId: string, supabase: any) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('free_images_generated')
      .eq('id', userId)
      .single()

    const newCount = (profile?.free_images_generated || 0) + 1

    const { error } = await supabase
      .from('profiles')
      .update({
        free_images_generated: newCount,
      })
      .eq('id', userId)

    if (error) throw error

    return newCount
  } catch (error: any) {
    console.error('Error incrementing image count:', error)
    return 0
  }
}
