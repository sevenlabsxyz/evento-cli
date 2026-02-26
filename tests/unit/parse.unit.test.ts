import { describe, expect, it } from 'vitest';
import { parseArgs } from '../../src/parse.js';

describe('parseArgs', () => {
  it('parses auth login with otp and email', () => {
    const parsed = parseArgs(['auth', 'login', '--email', 'user@example.com', '--otp']);
    expect(parsed.command).toEqual({
      family: 'auth',
      action: 'login',
      email: 'user@example.com',
      otp: true
    });
  });

  it('parses api call with query flags', () => {
    const parsed = parseArgs([
      '--format',
      'json',
      'api',
      'get',
      '/v1/events',
      '--limit',
      '10',
      '--offset',
      '0',
      '--q',
      'btc'
    ]);

    expect(parsed.flags.format).toBe('json');
    expect(parsed.command).toMatchObject({
      family: 'api',
      action: 'call',
      method: 'GET',
      path: '/v1/events',
      limit: 10,
      offset: 0,
      q: 'btc'
    });
  });

  it('parses events create with data-file', () => {
    const parsed = parseArgs(['events', 'create', '--data-file', './payload.json']);
    expect(parsed.command).toEqual({
      family: 'events',
      action: 'create',
      dataFile: './payload.json',
      data: undefined
    });
  });

  it('parses lowercase -v as version flag', () => {
    const parsed = parseArgs(['-v']);
    expect(parsed.command).toEqual({ family: 'meta', action: 'version' });
  });

  it('throws when otp is provided without email', () => {
    expect(() => parseArgs(['auth', 'login', '--otp'])).toThrowError(/--otp requires --email/);
  });

  it('throws on unknown api method', () => {
    expect(() => parseArgs(['api', 'TRACE', '/v1/events'])).toThrowError(/Invalid HTTP method/);
  });

  it('throws when api path has traversal', () => {
    expect(() => parseArgs(['api', 'GET', '/v1/../events'])).toThrowError(/Path traversal/);
  });

  it('returns unknown root command variant', () => {
    const parsed = parseArgs(['wat']);
    expect(parsed.command).toEqual({ family: 'meta', action: 'unknown', unknownToken: 'wat' });
  });

  it('parses events list query options', () => {
    const parsed = parseArgs(['events', 'list', '--limit', '1', '--offset', '2', '--q', 'x']);
    expect(parsed.command).toEqual({
      family: 'events',
      action: 'list',
      limit: 1,
      offset: 2,
      q: 'x'
    });
  });

  it('throws when data and data-file are both provided', () => {
    expect(() =>
      parseArgs(['events', 'create', '--data', '{}', '--data-file', './x.json'])
    ).toThrowError(/Conflicting flags/);
  });

  it('throws when global flag value is missing', () => {
    expect(() => parseArgs(['--profile'])).toThrowError(/Missing required argument/);
  });

  it('throws on invalid global format value', () => {
    expect(() => parseArgs(['--format', 'yaml'])).toThrowError(/--format must be json or text/);
  });

  it('throws for unknown auth subcommand and extra auth flag', () => {
    expect(() => parseArgs(['auth', 'wat'])).toThrowError(/Unknown subcommand/);
    expect(() => parseArgs(['auth', 'status', '--x'])).toThrowError(/Unknown flag/);
  });

  it('throws for unknown user subcommand', () => {
    expect(() => parseArgs(['user', 'list'])).toThrowError(/Unknown subcommand/);
  });

  it('parses user me', () => {
    const parsed = parseArgs(['user', 'me']);
    expect(parsed.command).toEqual({ family: 'user', action: 'me' });
  });

  it('throws for events missing id and unknown subcommand', () => {
    expect(() => parseArgs(['events', 'get'])).toThrowError(/Missing required argument: event-id/);
    expect(() => parseArgs(['events', 'wat'])).toThrowError(/Unknown subcommand/);
  });

  it('parses events delete and update/rsvp payload variants', () => {
    expect(parseArgs(['events', 'delete', 'evt_1']).command).toEqual({
      family: 'events',
      action: 'delete',
      eventId: 'evt_1'
    });

    expect(parseArgs(['events', 'update', 'evt_1', '--data', '{"title":"x"}']).command).toEqual({
      family: 'events',
      action: 'update',
      eventId: 'evt_1',
      data: '{"title":"x"}',
      dataFile: undefined
    });

    expect(parseArgs(['events', 'rsvp', 'evt_1', '--data-file', './rsvp.json']).command).toEqual({
      family: 'events',
      action: 'rsvp',
      eventId: 'evt_1',
      data: undefined,
      dataFile: './rsvp.json'
    });
  });

  it('throws for events list unknown flag', () => {
    expect(() => parseArgs(['events', 'list', '--wat'])).toThrowError(/Unknown flag/);
  });

  it('throws for api missing required positionals', () => {
    expect(() => parseArgs(['api'])).toThrowError(/Missing required argument: METHOD/);
    expect(() => parseArgs(['api', 'GET'])).toThrowError(/Missing required argument: PATH/);
  });

  it('throws for api invalid local flags and integer values', () => {
    expect(() => parseArgs(['api', 'GET', '/v1/events', '--limit', '-1'])).toThrowError(
      /non-negative integer/
    );
    expect(() => parseArgs(['api', 'GET', '/v1/events', '--wat'])).toThrowError(/Unknown flag/);
  });
});
