import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { DateField } from '../date-field';
import { DateField as WebDateField } from '../date-field.web';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  const Mock = (props: object) => <View testID="native-date-picker" {...props} />;
  return { __esModule: true, default: Mock, DateTimePickerAndroid: { open: jest.fn() } };
});

const androidOpen = DateTimePickerAndroid.open as jest.Mock;

const setup = async (value: string | null = null, extra: object = {}) => {
  const onChange = jest.fn();
  await render(<DateField label="Date of birth" value={value} onChange={onChange} {...extra} />);
  return onChange;
};
const openField = () => fireEvent.press(screen.getByRole('button', { name: 'Date of birth' }));

describe('DateField (iOS sheet)', () => {
  it('asks to choose a date when there is none, and writes a set date in words', async () => {
    await setup();
    expect(screen.getByText('Choose a date')).toBeTruthy();
  });

  it('shows the chosen date with its weekday, day, month name and year', async () => {
    await setup('2012-06-15');
    expect(screen.getByText('Friday, 15 June 2012')).toBeTruthy();
  });

  it('opens a picker, and Done reports the day that was picked as YYYY-MM-DD', async () => {
    const onChange = await setup();
    await openField();
    await fireEvent(
      screen.getByTestId('native-date-picker'),
      'change',
      {},
      new Date(2012, 5, 15, 23, 30)
    );
    expect(onChange).not.toHaveBeenCalled(); // nothing is committed until Done
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onChange).toHaveBeenCalledWith('2012-06-15');
  });

  it('starts the picker on the current value, or on the initial date', async () => {
    await setup('1990-03-02');
    await openField();
    expect(isoOf(screen.getByTestId('native-date-picker').props.value)).toBe('1990-03-02');
  });

  it('starts on the initial date when there is no value', async () => {
    await setup(null, { initialDate: '2005-05-05' });
    await openField();
    expect(isoOf(screen.getByTestId('native-date-picker').props.value)).toBe('2005-05-05');
  });

  it('cannot pick before 1900 or after the latest allowed day', async () => {
    const maxDate = new Date(2026, 10, 10);
    await setup(null, { maxDate });
    await openField();
    const picker = screen.getByTestId('native-date-picker').props;
    expect(isoOf(picker.minimumDate)).toBe('1900-01-01');
    expect(picker.maximumDate).toBe(maxDate);
  });

  it('Cancel leaves the date as it was', async () => {
    const onChange = await setup('2012-06-15');
    await openField();
    await fireEvent(screen.getByTestId('native-date-picker'), 'change', {}, new Date(2000, 0, 1));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers to clear a date only when there is one, and clearing reports null', async () => {
    const empty = await setup();
    await openField();
    expect(screen.queryByText('Clear the date')).toBeNull();
    expect(empty).not.toHaveBeenCalled();
  });

  it('clears a set date', async () => {
    const onChange = await setup('2012-06-15');
    await openField();
    await fireEvent.press(screen.getByText('Clear the date'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('DateField (Android dialog)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    androidOpen.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens the system dialog on the current value, within bounds', async () => {
    await setup('1990-03-02');
    await openField();
    expect(androidOpen).toHaveBeenCalledTimes(1);
    const options = androidOpen.mock.calls[0][0];
    expect(options.mode).toBe('date');
    expect(isoOf(options.value)).toBe('1990-03-02');
    expect(isoOf(options.minimumDate)).toBe('1900-01-01');
  });

  it('reports a date the person set, and ignores a dismissed dialog', async () => {
    const onChange = await setup();
    await openField();
    const { onChange: dialogChange } = androidOpen.mock.calls[0][0];
    dialogChange({ type: 'dismissed' }, undefined);
    expect(onChange).not.toHaveBeenCalled();
    dialogChange({ type: 'set' }, new Date(2012, 5, 15));
    expect(onChange).toHaveBeenCalledWith('2012-06-15');
  });
});

describe('DateField (web)', () => {
  const setupWeb = async (value: string | null = null) => {
    const onChange = jest.fn();
    await render(<WebDateField label="Date of birth" value={value} onChange={onChange} />);
    return onChange;
  };

  it('shows an existing date as DD/MM/YYYY', async () => {
    await setupWeb('2012-06-15');
    expect(screen.getByDisplayValue('15/06/2012')).toBeTruthy();
  });

  it('reports a valid typed date as YYYY-MM-DD, and null while it is not valid', async () => {
    const onChange = await setupWeb();
    const input = screen.getByLabelText('Date of birth');
    await fireEvent.changeText(input, '15/06/2012');
    expect(onChange).toHaveBeenLastCalledWith('2012-06-15');
    await fireEvent.changeText(input, '31/02/2024');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Use DD/MM/YYYY, for example 15/06/2012.')).toBeTruthy();
    await fireEvent.changeText(input, '');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/Use DD\/MM\/YYYY/)).toBeNull();
  });
});

function isoOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
