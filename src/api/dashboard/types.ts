export interface IKpis {
  bookingsToday: number;
  bookingsThisMonth: number;
  bookingsThisYear: number;
  revenueThisMonth: number;  // sum of booking line prices for confirmed bookings

  // New KPIs (scope-aware)
  totalBookings: number;
  upcomingBookings: number;     // future, not done yet
  pastDoneBookings: number;     // ended (all lines in the past) + confirmed
  cancelledBookings: number;

  currentCourses: number;       // sessions running now (count distinct courseId)
  currentTournaments: number;   // tournaments where startAt <= now < endAt
  totalCourses: number;         // distinct courses under scope
  totalTournaments: number;     // tournaments under scope
}

export interface ILabelCount {
  label: string;
  count: number;
}

export interface IActivityRecord {
  title: string;
  subtitle?: string | null;
  date: Date;
}

export interface IDashboardData {
  kpis: IKpis;
  byStatus: ILabelCount[];
  byFacility: ILabelCount[];
  bySport: ILabelCount[];
  monthlyCountsGregorian: number[]; // 12-length, Jan..Dec for selected Gregorian year
  monthlyCountsPersian?: number[];  // 12-length, Farvardin..Esfand (if Calendar table available)
  topTeachersThisMonth: ILabelCount[];
  lastActivities: IActivityRecord[];
}
