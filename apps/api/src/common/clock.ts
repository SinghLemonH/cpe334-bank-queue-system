import { Injectable } from '@nestjs/common';

export interface IClock {
  now(): Date;
  today(): string;
}

export const CLOCK_TOKEN = 'IClock';

@Injectable()
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }

  today(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(this.now());
  }
}

export class ManualClock implements IClock {
  private currentTime: Date;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime ? new Date(initialTime.getTime()) : new Date();
  }

  setTime(time: Date): void {
    this.currentTime = new Date(time.getTime());
  }

  advanceMinutes(minutes: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + minutes * 60 * 1000);
  }

  advanceDays(days: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + days * 24 * 60 * 60 * 1000);
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  today(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(this.now());
  }
}
