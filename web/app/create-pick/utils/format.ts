/** Format market value for display (1/X/2, BTTS Yes/No, etc.) */
export function formatMarketValue(marketName: string, value: string): string {
  if (marketName === 'Match Winner') {
    if (value === 'Home') return '1';
    if (value === 'Draw') return 'X';
    if (value === 'Away') return '2';
  }
  if (marketName === 'Both Teams To Score') {
    return value === 'Yes' ? 'BTTS Yes' : 'BTTS No';
  }
  if (marketName === 'Half-Time/Full-Time') {
    return value
      .replace(/\bHome\b/g, '1')
      .replace(/\bDraw\b/g, 'X')
      .replace(/\bAway\b/g, '2');
  }
  return value;
}

/** Format fixture date and time for display */
export function formatFixtureDateTime(matchDate: string): string {
  const date = new Date(matchDate);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const day = date.getDate();
  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`;

  return `${dayWithOrdinal} ${month} ${year}, ${time}`;
}
