// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './button';

describe('Button', () => {
  it('renders its children as the button label', () => {
    render(<Button>Play now</Button>);

    expect(screen.getByRole('button', { name: 'Play now' })).toBeInTheDocument();
  });

  it.each([
    { disabled: false, expectedCalls: 1, label: 'Enabled' },
    { disabled: true, expectedCalls: 0, label: 'Disabled' },
  ])(
    'forwards click to onClick when disabled=$disabled (expects $expectedCalls calls)',
    async ({ disabled, expectedCalls, label }) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabled={disabled}>
          {label}
        </Button>,
      );

      await user.click(screen.getByRole('button', { name: label }));

      expect(onClick).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});
