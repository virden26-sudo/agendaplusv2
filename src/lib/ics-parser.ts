
export interface ICSEvent {
  title: string;
  start: Date;
  description: string;
  course?: string;
  location?: string;
}

export function parseICS(data: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const lines = data.split(/\r?\n/);
  let currentEvent: Partial<ICSEvent> | null = null;
  let inEvent = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle line folding (lines starting with space/tab are continuations)
    while (i + 1 < lines.length && (lines[i+1].startsWith(' ') || lines[i+1].startsWith('\t'))) {
      line += lines[i+1].substring(1);
      i++;
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
      inEvent = true;
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.title && currentEvent.start) {
        events.push(currentEvent as ICSEvent);
      }
      currentEvent = null;
      inEvent = false;
    } else if (inEvent && currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.replace('SUMMARY:', '').trim().replace(/\\,/g, ',');
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.replace('DESCRIPTION:', '').trim()
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',');
      } else if (line.startsWith('DTSTART')) {
        const value = line.split(':')[1] || line.split(';')[1]?.split(':')[1];
        if (value) {
            // Format: YYYYMMDDTHHMMSSZ or YYYYMMDD
            const year = parseInt(value.substring(0, 4));
            const month = parseInt(value.substring(4, 6)) - 1;
            const day = parseInt(value.substring(6, 8));
            
            if (value.includes('T')) {
                const hour = parseInt(value.substring(9, 11));
                const min = parseInt(value.substring(11, 13));
                currentEvent.start = new Date(year, month, day, hour, min);
            } else {
                currentEvent.start = new Date(year, month, day);
            }
        }
      } else if (line.startsWith('LOCATION:')) {
         currentEvent.location = line.replace('LOCATION:', '').trim().replace(/\\,/g, ',');
         currentEvent.course = currentEvent.location; // Often used for course names in LMS
      }
    }
  }
  return events;
}
