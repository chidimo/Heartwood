import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { QueryState } from '../query-state';

const q = (state: Partial<UseQueryResult<string[]>>) => state as UseQueryResult<string[]>;
const list = (data: string[]) => <Text>{data.join(',')}</Text>;

describe('QueryState', () => {
  it('shows a spinner while pending, never fake data', async () => {
    await render(<QueryState query={q({ isPending: true, isError: false })}>{list}</QueryState>);
    expect(screen.queryByText('a,b')).toBeNull();
  });

  it("shows the server's error message when the query failed", async () => {
    const error = new ApiError('Server said no', 500);
    await render(
      <QueryState query={q({ isPending: false, isError: true, error })}>{list}</QueryState>
    );
    expect(await screen.findByText('Server said no')).toBeTruthy();
  });

  it('shows the empty state when there is nothing to show', async () => {
    await render(
      <QueryState
        query={q({ isPending: false, isError: false, data: [] })}
        isEmpty={d => d.length === 0}
        empty={<Text>Nothing yet</Text>}
      >
        {list}
      </QueryState>
    );
    expect(await screen.findByText('Nothing yet')).toBeTruthy();
  });

  it('renders the data when it loaded', async () => {
    await render(
      <QueryState query={q({ isPending: false, isError: false, data: ['a', 'b'] })}>
        {list}
      </QueryState>
    );
    expect(await screen.findByText('a,b')).toBeTruthy();
  });
});
