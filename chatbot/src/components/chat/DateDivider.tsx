import styles from './DateDivider.module.css';

interface DateDividerProps {
  date: string; // Pre-formatted: "Today", "Yesterday", or "January 15, 2025"
}

/**
 * Date divider component - shows centered date text with horizontal lines
 * WhatsApp/iMessage style
 */
export default function DateDivider({ date }: DateDividerProps) {
  return (
    <div className={styles.dateDivider}>
      <hr className={styles.dividerLine} />
      <span className={styles.dateText}>{date}</span>
      <hr className={styles.dividerLine} />
    </div>
  );
}
