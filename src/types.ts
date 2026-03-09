export interface Collection {
  id: number;
  name: string;
  place: string;
  contact: string;
  target_amount: number;
  amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

export interface Stats {
  totalPaid: number;
  totalUnpaid: number;
  totalTarget: number;
  countTotal: number;
  countCollected: number;
  countPending: number;
  placeStats: {
    place: string;
    total: number;
    paid: number;
    unpaid: number;
  }[];
  leaderboard: {
    name: string;
    place: string;
    target_amount: number;
    amount: number;
    status: 'paid' | 'unpaid' | 'partial';
  }[];
}
