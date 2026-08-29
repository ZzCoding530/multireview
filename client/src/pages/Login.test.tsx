import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Login from './Login';

describe('登录页', () => {
  it('渲染平台标题', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByText('mini-modguard')).toBeInTheDocument();
  });
});
