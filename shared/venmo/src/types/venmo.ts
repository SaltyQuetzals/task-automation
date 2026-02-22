export interface VenmoRequestPayload {
  user_id: string;
  amount: number;
  note: string;
  audience: "private" | "friends" | "public";
  metadata: {
    quasi_cash_disclaimer_viewed: boolean;
  };
}

export interface VenmoPayment {
  id: string;
  status: string;
  amount: number;
}

export interface VenmoResponseData {
  payment?: VenmoPayment;
}

export interface VenmoResponse {
  data?: VenmoResponseData;
}
