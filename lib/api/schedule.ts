import { ApiClient } from './client';

export interface BusySlot {
  id: string;
  day_of_week: number; // 0=Monday, 6=Sunday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  activity_type?: string;
  description?: string;
  recurring: boolean;
  specific_date?: string; // YYYY-MM-DD format for one-time events
}

export interface BusySlotInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type?: string;
  description?: string;
  recurring?: boolean;
  specific_date?: string;
}

export const ScheduleService = {
  async getBusySlots(): Promise<BusySlot[]> {
    return ApiClient.get<BusySlot[]>('/schedule/busy-slots');
  },

  async createBusySlot(slot: BusySlotInput): Promise<BusySlot> {
    return ApiClient.post<BusySlot>('/schedule/busy-slots', slot);
  },

  async updateBusySlot(slotId: string, slot: BusySlotInput): Promise<BusySlot> {
    return ApiClient.put<BusySlot>(`/schedule/busy-slots/${slotId}`, slot);
  },

  async deleteBusySlot(slotId: string): Promise<void> {
    return ApiClient.delete(`/schedule/busy-slots/${slotId}`);
  },
};
