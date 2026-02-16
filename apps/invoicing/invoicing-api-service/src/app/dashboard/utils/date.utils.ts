/**
 * Get the week label for a given date string.
 * Returns the Monday of the week in "MMM D" format (e.g., "Jan 1", "Jan 8").
 */
export function getWeekLabel(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDay();
    // Calculate Monday of this week (day 0 = Sunday, 1 = Monday, etc.)
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[monday.getMonth()]} ${monday.getDate()}`;
}
