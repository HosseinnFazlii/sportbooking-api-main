import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('calendar')
export class Calendar {
  @PrimaryColumn({ type: 'int', name: 'date_key' })
  dateKey: number;

  @Column({ type: 'date', name: 'gregorian_date', nullable: true })
  gregorianDate?: string | Date;

  @Column({ type: 'smallint', name: 'gregorian_year', nullable: true })
  gregorianYear?: number;

  @Column({ type: 'smallint', name: 'gregorian_month_no', nullable: true })
  gregorianMonthNo?: number;

  @Column({ type: 'smallint', name: 'gregorian_day_in_month', nullable: true })
  gregorianDayInMonth?: number;

  @Column({ type: 'smallint', name: 'gregorian_month_day_int', nullable: true })
  gregorianMonthDayInt?: number;

  @Column({ type: 'smallint', name: 'gregorian_day_of_week', nullable: true })
  gregorianDayOfWeek?: number;

  @Column({ type: 'text', name: 'gregorian_month_name', nullable: true })
  gregorianMonthName?: string;

  @Column({ type: 'char', length: 10, name: 'gregorian_str', nullable: true })
  gregorianStr?: string;

  @Column({ type: 'int', name: 'gregorian_year_month_int', nullable: true })
  gregorianYearMonthInt?: number;

  @Column({ type: 'char', length: 7, name: 'gregorian_year_month_str', nullable: true })
  gregorianYearMonthStr?: string;

  @Column({ type: 'text', name: 'gregorian_day_of_week_name', nullable: true })
  gregorianDayOfWeekName?: string;

  @Column({ type: 'text', name: 'gregorian_week_of_year_name', nullable: true })
  gregorianWeekOfYearName?: string;

  @Column({ type: 'int', name: 'gregorian_week_of_year_no', nullable: true })
  gregorianWeekOfYearNo?: number;

  @Column({ type: 'int', name: 'persian_int', nullable: true })
  persianInt?: number;

  @Column({ type: 'smallint', name: 'persian_year', nullable: true })
  persianYear?: number;

  @Column({ type: 'smallint', name: 'persian_month_no', nullable: true })
  persianMonthNo?: number;

  @Column({ type: 'smallint', name: 'persian_day_in_month', nullable: true })
  persianDayInMonth?: number;

  @Column({ type: 'smallint', name: 'persian_month_day_int', nullable: true })
  persianMonthDayInt?: number;

  @Column({ type: 'smallint', name: 'persian_day_of_week', nullable: true })
  persianDayOfWeek?: number;

  @Column({ type: 'text', name: 'persian_month_name', nullable: true })
  persianMonthName?: string;

  @Column({ type: 'char', length: 10, name: 'persian_str', nullable: true })
  persianStr?: string;

  @Column({ type: 'int', name: 'persian_year_month_int', nullable: true })
  persianYearMonthInt?: number;

  @Column({ type: 'char', length: 7, name: 'persian_year_month_str', nullable: true })
  persianYearMonthStr?: string;

  @Column({ type: 'text', name: 'persian_day_of_week_name', nullable: true })
  persianDayOfWeekName?: string;

  @Column({ type: 'text', name: 'persian_week_of_year_name', nullable: true })
  persianWeekOfYearName?: string;

  @Column({ type: 'int', name: 'persian_week_of_year_no', nullable: true })
  persianWeekOfYearNo?: number;

  @Column({ type: 'text', name: 'persian_full_name', nullable: true })
  persianFullName?: string;

  @Column({ type: 'int', name: 'hijri_int', nullable: true })
  hijriInt?: number;

  @Column({ type: 'smallint', name: 'hijri_year', nullable: true })
  hijriYear?: number;

  @Column({ type: 'smallint', name: 'hijri_month_no', nullable: true })
  hijriMonthNo?: number;

  @Column({ type: 'smallint', name: 'hijri_day_in_month', nullable: true })
  hijriDayInMonth?: number;

  @Column({ type: 'smallint', name: 'hijri_month_day_int', nullable: true })
  hijriMonthDayInt?: number;

  @Column({ type: 'smallint', name: 'hijri_day_of_week', nullable: true })
  hijriDayOfWeek?: number;

  @Column({ type: 'text', name: 'hijri_month_name', nullable: true })
  hijriMonthName?: string;

  @Column({ type: 'char', length: 10, name: 'hijri_str', nullable: true })
  hijriStr?: string;

  @Column({ type: 'int', name: 'hijri_year_month_int', nullable: true })
  hijriYearMonthInt?: number;

  @Column({ type: 'char', length: 7, name: 'hijri_year_month_str', nullable: true })
  hijriYearMonthStr?: string;

  @Column({ type: 'text', name: 'hijri_day_of_week_name', nullable: true })
  hijriDayOfWeekName?: string;

  @Column({ type: 'text', name: 'hijri_week_of_year_name', nullable: true })
  hijriWeekOfYearName?: string;

  @Column({ type: 'int', name: 'hijri_week_of_year_no', nullable: true })
  hijriWeekOfYearNo?: number;

  @Column({ type: 'smallint', name: 'season_code', nullable: true })
  seasonCode?: number;

  @Column({ type: 'text', name: 'season_name', nullable: true })
  seasonName?: string;

  @Column({ type: 'boolean', name: 'is_gregorian_leap', nullable: true })
  isGregorianLeap?: boolean;

  @Column({ type: 'boolean', name: 'is_persian_leap', nullable: true })
  isPersianLeap?: boolean;

  @Column({ type: 'boolean', name: 'is_one_day_before_persian_holiday', nullable: true })
  isOneDayBeforePersianHoliday?: boolean;

  @Column({ type: 'boolean', name: 'is_one_day_before_hijri_holiday', nullable: true })
  isOneDayBeforeHijriHoliday?: boolean;
}
