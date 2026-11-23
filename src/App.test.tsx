import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from './App';

describe('App', () => {
  test('crash olmadan render edilir', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
