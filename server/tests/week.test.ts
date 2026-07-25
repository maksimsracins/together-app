import { addHours, subHours, subWeeks } from 'date-fns';
import { latestClosedWeek, weekCloseThreshold, weekIdFor } from '../src/week';

describe('latestClosedWeek', () => {
  it('resolves to the previous week before this week\'s Sunday 20:00 threshold', () => {
    const threshold = weekCloseThreshold(new Date());
    const before = subHours(threshold, 1);
    const result = latestClosedWeek(before);
    expect(result.weekId).toBe(weekIdFor(subWeeks(before, 1)));
  });

  it('resolves to the week that just closed once its Sunday 20:00 threshold has passed', () => {
    const threshold = weekCloseThreshold(new Date());
    const after = addHours(threshold, 1);
    const result = latestClosedWeek(after);
    expect(result.weekId).toBe(weekIdFor(after));
  });

  it('treats the exact close threshold as already closed', () => {
    const threshold = weekCloseThreshold(new Date());
    const result = latestClosedWeek(threshold);
    expect(result.weekId).toBe(weekIdFor(threshold));
  });

  it('never resolves to a week that has not closed yet, regardless of when "now" falls', () => {
    const threshold = weekCloseThreshold(new Date());
    const before = subHours(threshold, 1);
    const after = addHours(threshold, 1);
    expect(latestClosedWeek(before).weekId).not.toBe(weekIdFor(before));
    expect(latestClosedWeek(after).weekId).not.toBe(weekIdFor(subWeeks(after, 1)));
  });
});
