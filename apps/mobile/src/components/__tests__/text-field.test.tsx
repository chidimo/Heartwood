import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../text-field';

describe('TextField password', () => {
  it('hides the value until Show is pressed', async () => {
    await render(
      <TextField label="Password" value="secret" onChangeText={() => {}} secureTextEntry />
    );
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Show Password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText('Hide Password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('has no toggle on other fields', async () => {
    await render(<TextField label="Email" value="" onChangeText={() => {}} />);
    expect(screen.queryByText('Show')).toBeNull();
  });
});
