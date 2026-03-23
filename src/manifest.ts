import type { HttpRequestOptions } from './http/client.js';

export type FlagType = 'string' | 'boolean';

export interface ParsedNamedOptions {
  data?: string;
  dataFile?: string;
  file?: string;
  contentType?: string;
  noAuth?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface ParsedNamedCommand {
  family: 'named';
  definitionId: string;
  commandPath: string[];
  positionals: Record<string, string>;
  options: ParsedNamedOptions;
}

export interface ParsedApiCommand {
  family: 'api';
  action: 'call';
  method: string;
  path: string;
  data?: string;
  dataFile?: string;
  file?: string;
  contentType?: string;
  noAuth?: boolean;
  limit?: number;
  offset?: number;
  q?: string;
}

export interface NamedFlagDefinition {
  name: string;
  type: FlagType;
  description?: string;
}

export interface CommandRequestContext {
  positionals: Record<string, string>;
  options: ParsedNamedOptions;
}

export interface BuiltCommandRequest {
  method: string;
  path: string;
  options?: HttpRequestOptions;
}

export interface CommandDefinition {
  id: string;
  tokens: string[];
  aliases?: string[][];
  positionals?: string[];
  flags?: NamedFlagDefinition[];
  summary: string;
  acceptsJson?: boolean;
  acceptsFile?: boolean;
  requiresBody?: boolean;
  // eslint-disable-next-line no-unused-vars
  buildRequest: (...args: [CommandRequestContext]) => BuiltCommandRequest;
}

const boolFlag = (name: string, description?: string): NamedFlagDefinition => ({ name, type: 'boolean', description });
const stringFlag = (name: string, description?: string): NamedFlagDefinition => ({ name, type: 'string', description });

function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: 'profile.get',
    tokens: ['profile', 'get'],
    aliases: [['user', 'me']],
    summary: 'Get the current authenticated profile',
    buildRequest: () => ({ method: 'GET', path: '/v1/user' })
  },
  {
    id: 'profile.update',
    tokens: ['profile', 'update'],
    summary: 'Update the current authenticated profile',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PATCH', path: '/v1/user' })
  },
  {
    id: 'profile.search',
    tokens: ['profile', 'search'],
    flags: [stringFlag('q', 'Search query')],
    summary: 'Search user profiles',
    buildRequest: ({ options }) => ({
      method: 'GET',
      path: `/v1/user/search${queryString({ s: options.q as string | undefined })}`
    })
  },
  {
    id: 'profile.upload-avatar',
    tokens: ['profile', 'upload-avatar'],
    summary: 'Upload the current profile avatar',
    acceptsFile: true,
    requiresBody: true,
    buildRequest: () => ({
      method: 'POST',
      path: '/v1/user/details/image-upload',
      options: {
        fileNameQueryParam: 'filename'
      }
    })
  },
  {
    id: 'profile.follow-status',
    tokens: ['profile', 'follow-status'],
    positionals: ['userId'],
    summary: 'Check if the current user follows another user',
    buildRequest: ({ positionals }) => ({
      method: 'GET',
      path: `/v1/user/follow${queryString({ id: positionals.userId })}`
    })
  },
  {
    id: 'profile.follow',
    tokens: ['profile', 'follow'],
    positionals: ['userId'],
    summary: 'Follow a user',
    buildRequest: ({ positionals }) => ({
      method: 'POST',
      path: '/v1/user/follow',
      options: { body: { followId: positionals.userId } }
    })
  },
  {
    id: 'profile.unfollow',
    tokens: ['profile', 'unfollow'],
    positionals: ['userId'],
    summary: 'Unfollow a user',
    buildRequest: ({ positionals }) => ({
      method: 'DELETE',
      path: '/v1/user/follow',
      options: { body: { followId: positionals.userId } }
    })
  },
  {
    id: 'profile.interest.list',
    tokens: ['profile', 'interest', 'list'],
    summary: 'List current user interests',
    buildRequest: () => ({ method: 'GET', path: '/v1/user/interests' })
  },
  {
    id: 'profile.interest.add',
    tokens: ['profile', 'interest', 'add'],
    summary: 'Add interests to the current profile',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/user/interests' })
  },
  {
    id: 'profile.interest.replace',
    tokens: ['profile', 'interest', 'replace'],
    summary: 'Replace current user interests',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/user/interests' })
  },
  {
    id: 'profile.interest.remove',
    tokens: ['profile', 'interest', 'remove'],
    positionals: ['interestId'],
    summary: 'Remove a single interest from the current profile',
    buildRequest: ({ positionals }) => ({
      method: 'DELETE',
      path: `/v1/user/interests/${positionals.interestId}`
    })
  },
  {
    id: 'profile.list.list',
    tokens: ['profile', 'list', 'list'],
    summary: 'List the current user lists',
    buildRequest: () => ({ method: 'GET', path: '/v1/user/lists' })
  },
  {
    id: 'profile.list.create',
    tokens: ['profile', 'list', 'create'],
    summary: 'Create a user list',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/user/lists' })
  },
  {
    id: 'profile.list.update',
    tokens: ['profile', 'list', 'update'],
    positionals: ['listId'],
    summary: 'Update a user list',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/user/lists/${positionals.listId}` })
  },
  {
    id: 'profile.list.delete',
    tokens: ['profile', 'list', 'delete'],
    positionals: ['listId'],
    summary: 'Delete a user list',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/user/lists/${positionals.listId}` })
  },
  {
    id: 'profile.list.event.list',
    tokens: ['profile', 'list', 'event', 'list'],
    positionals: ['listId'],
    summary: 'List events in a user list',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/user/lists/${positionals.listId}/events` })
  },
  {
    id: 'profile.list.event.add',
    tokens: ['profile', 'list', 'event', 'add'],
    positionals: ['listId'],
    summary: 'Add an event to a user list',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/user/lists/${positionals.listId}/events` })
  },
  {
    id: 'profile.list.event.remove',
    tokens: ['profile', 'list', 'event', 'remove'],
    positionals: ['listId', 'eventId'],
    summary: 'Remove an event from a user list',
    buildRequest: ({ positionals }) => ({
      method: 'DELETE',
      path: `/v1/user/lists/${positionals.listId}/events/${positionals.eventId}`
    })
  },
  {
    id: 'profile.prompt.list',
    tokens: ['profile', 'prompt', 'list'],
    summary: 'List current user prompts',
    buildRequest: () => ({ method: 'GET', path: '/v1/user/prompts' })
  },
  {
    id: 'profile.prompt.create',
    tokens: ['profile', 'prompt', 'create'],
    summary: 'Create a profile prompt answer',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/user/prompts' })
  },
  {
    id: 'profile.prompt.update',
    tokens: ['profile', 'prompt', 'update'],
    positionals: ['userPromptId'],
    summary: 'Update a profile prompt answer',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/user/prompts/${positionals.userPromptId}` })
  },
  {
    id: 'profile.prompt.delete',
    tokens: ['profile', 'prompt', 'delete'],
    positionals: ['userPromptId'],
    summary: 'Delete a profile prompt answer',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/user/prompts/${positionals.userPromptId}` })
  },
  {
    id: 'profile.prompt.reorder',
    tokens: ['profile', 'prompt', 'reorder'],
    summary: 'Reorder profile prompts',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PATCH', path: '/v1/user/prompts/reorder' })
  },
  {
    id: 'profile.pinned-event.get',
    tokens: ['profile', 'pinned-event', 'get'],
    flags: [stringFlag('username', 'Username to inspect')],
    summary: 'Fetch a pinned event by username',
    buildRequest: ({ options }) => ({
      method: 'GET',
      path: `/v1/user/pinned-event${queryString({ username: options.username as string | undefined })}`,
      options: { auth: false }
    })
  },
  {
    id: 'profile.pinned-event.set',
    tokens: ['profile', 'pinned-event', 'set'],
    summary: 'Set or clear the pinned event for the current profile',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PATCH', path: '/v1/user/pinned-event' })
  },
  {
    id: 'profile.badge.list',
    tokens: ['profile', 'badge', 'list'],
    summary: 'List current user badges',
    buildRequest: () => ({ method: 'GET', path: '/v1/user/badges' })
  },
  {
    id: 'profile.cohost-invite.list',
    tokens: ['profile', 'cohost-invite', 'list'],
    flags: [stringFlag('status', 'pending|responded|all')],
    summary: 'List current user cohost invites',
    buildRequest: ({ options }) => ({
      method: 'GET',
      path: `/v1/user/cohost-invites${queryString({ status: options.status as string | undefined })}`
    })
  },
  {
    id: 'profile.cohost-invite.accept',
    tokens: ['profile', 'cohost-invite', 'accept'],
    positionals: ['inviteId'],
    summary: 'Accept a cohost invite',
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/cohost-invites/${positionals.inviteId}/accept` })
  },
  {
    id: 'profile.cohost-invite.reject',
    tokens: ['profile', 'cohost-invite', 'reject'],
    positionals: ['inviteId'],
    summary: 'Reject a cohost invite',
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/cohost-invites/${positionals.inviteId}/reject` })
  },
  {
    id: 'profile.cohost-invite.cancel',
    tokens: ['profile', 'cohost-invite', 'cancel'],
    positionals: ['inviteId'],
    summary: 'Cancel a cohost invite',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/cohost-invites/${positionals.inviteId}` })
  },
  {
    id: 'event.list',
    tokens: ['event', 'list'],
    aliases: [['events', 'list']],
    flags: [stringFlag('q'), stringFlag('limit'), stringFlag('offset')],
    summary: 'List events',
    buildRequest: ({ options }) => ({
      method: 'GET',
      path: `/v1/events${queryString({ limit: options.limit, offset: options.offset, q: options.q })}`
    })
  },
  {
    id: 'event.get',
    tokens: ['event', 'get'],
    aliases: [['events', 'get']],
    positionals: ['eventId'],
    summary: 'Get an event by id',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}` })
  },
  {
    id: 'event.create',
    tokens: ['event', 'create'],
    aliases: [['events', 'create']],
    summary: 'Create an event',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/events' })
  },
  {
    id: 'event.update',
    tokens: ['event', 'update'],
    aliases: [['events', 'update']],
    positionals: ['eventId'],
    summary: 'Update an event',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}` })
  },
  {
    id: 'event.delete',
    tokens: ['event', 'delete'],
    aliases: [['events', 'delete']],
    positionals: ['eventId'],
    summary: 'Delete an event',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}` })
  },
  {
    id: 'event.feed',
    tokens: ['event', 'feed'],
    summary: 'List the event feed',
    buildRequest: () => ({ method: 'GET', path: '/v1/events/feed' })
  },
  {
    id: 'event.following',
    tokens: ['event', 'following'],
    summary: 'List following events',
    buildRequest: () => ({ method: 'GET', path: '/v1/events/following' })
  },
  {
    id: 'event.for-you',
    tokens: ['event', 'for-you'],
    summary: 'List recommended events',
    buildRequest: () => ({ method: 'GET', path: '/v1/events/for-you' })
  },
  {
    id: 'event.draft.list',
    tokens: ['event', 'draft', 'list'],
    flags: [stringFlag('limit'), stringFlag('offset')],
    summary: 'List current user draft events',
    buildRequest: ({ options }) => ({ method: 'GET', path: `/v1/events/me/drafts${queryString({ limit: options.limit, offset: options.offset })}` })
  },
  {
    id: 'event.mine.list',
    tokens: ['event', 'mine', 'list'],
    flags: [stringFlag('filter'), stringFlag('search'), stringFlag('sort-by'), stringFlag('sort-order'), stringFlag('timeframe'), stringFlag('page'), stringFlag('limit')],
    summary: 'List current user events',
    buildRequest: ({ options }) => ({
      method: 'GET',
      path: `/v1/events/user-events${queryString({
        filter: options.filter,
        search: options.search,
        sortBy: options['sort-by'],
        sortOrder: options['sort-order'],
        timeframe: options.timeframe,
        page: options.page,
        limit: options.limit
      })}`
    })
  },
  {
    id: 'event.publish',
    tokens: ['event', 'publish'],
    positionals: ['eventId'],
    summary: 'Publish an event',
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/publish` })
  },
  {
    id: 'event.cancel',
    tokens: ['event', 'cancel'],
    positionals: ['eventId'],
    flags: [boolFlag('send-emails')],
    summary: 'Cancel an event',
    buildRequest: ({ positionals, options }) => ({
      method: 'DELETE',
      path: `/v1/events/${positionals.eventId}/cancel${queryString({ sendEmails: Boolean(options['send-emails']) })}`
    })
  },
  {
    id: 'event.host.list',
    tokens: ['event', 'host', 'list'],
    positionals: ['eventId'],
    summary: 'List event hosts',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/hosts`, options: { auth: false } })
  },
  {
    id: 'event.host.add',
    tokens: ['event', 'host', 'add'],
    positionals: ['eventId'],
    summary: 'Add an event host',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/hosts` })
  },
  {
    id: 'event.host.remove',
    tokens: ['event', 'host', 'remove'],
    positionals: ['eventId'],
    summary: 'Remove an event host',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/hosts` })
  },
  {
    id: 'event.invite.send',
    tokens: ['event', 'invite', 'send'],
    positionals: ['eventId'],
    summary: 'Send event invites',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/invites` })
  },
  {
    id: 'event.invite.list',
    tokens: ['event', 'invite', 'list'],
    flags: [stringFlag('status')],
    summary: 'List current user event invites',
    buildRequest: ({ options }) => ({ method: 'GET', path: `/v1/events/invites${queryString({ status: options.status as string | undefined })}` })
  },
  {
    id: 'event.invite.respond',
    tokens: ['event', 'invite', 'respond'],
    positionals: ['eventId'],
    summary: 'Respond to an event invite',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/invites` })
  },
  {
    id: 'event.cohost-invite.list',
    tokens: ['event', 'cohost-invite', 'list'],
    positionals: ['eventId'],
    flags: [stringFlag('status')],
    summary: 'List cohost invites for an event',
    buildRequest: ({ positionals, options }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/cohost-invites${queryString({ status: options.status as string | undefined })}` })
  },
  {
    id: 'event.cohost-invite.send',
    tokens: ['event', 'cohost-invite', 'send'],
    positionals: ['eventId'],
    summary: 'Send cohost invites',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/cohost-invites` })
  },
  {
    id: 'event.comment.list',
    tokens: ['event', 'comment', 'list'],
    positionals: ['eventId'],
    summary: 'List event comments',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/comments` })
  },
  {
    id: 'event.comment.add',
    tokens: ['event', 'comment', 'add'],
    positionals: ['eventId'],
    summary: 'Add an event comment',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/comments` })
  },
  {
    id: 'event.comment.edit',
    tokens: ['event', 'comment', 'edit'],
    positionals: ['eventId'],
    summary: 'Edit an event comment',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/comments` })
  },
  {
    id: 'event.comment.delete',
    tokens: ['event', 'comment', 'delete'],
    positionals: ['eventId', 'commentId'],
    summary: 'Delete an event comment',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/comments/${positionals.commentId}` })
  },
  {
    id: 'event.gallery.list',
    tokens: ['event', 'gallery', 'list'],
    positionals: ['eventId'],
    summary: 'List gallery items for an event',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/gallery`, options: { auth: false } })
  },
  {
    id: 'event.gallery.upload',
    tokens: ['event', 'gallery', 'upload'],
    positionals: ['eventId'],
    summary: 'Upload an event gallery image',
    acceptsFile: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({
      method: 'POST',
      path: `/v1/events/${positionals.eventId}/gallery/upload`,
      options: { fileNameQueryParam: 'filename' }
    })
  },
  {
    id: 'event.gallery.delete',
    tokens: ['event', 'gallery', 'delete'],
    positionals: ['eventId'],
    flags: [stringFlag('gallery-item-id')],
    summary: 'Delete an event gallery item',
    buildRequest: ({ positionals, options }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/gallery${queryString({ galleryItemId: options['gallery-item-id'] as string | undefined })}` })
  },
  {
    id: 'event.rsvp.list',
    tokens: ['event', 'rsvp', 'list'],
    positionals: ['eventId'],
    summary: 'List RSVPs for an event',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/rsvps` })
  },
  {
    id: 'event.rsvp.get',
    tokens: ['event', 'rsvp', 'get'],
    positionals: ['eventId'],
    summary: 'Get the current user RSVP for an event',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/rsvps/me` })
  },
  {
    id: 'event.rsvp.set',
    tokens: ['event', 'rsvp', 'set'],
    positionals: ['eventId', 'status'],
    aliases: [['events', 'rsvp']],
    summary: 'Set the current user RSVP for an event',
    buildRequest: ({ positionals }) => ({
      method: 'POST',
      path: `/v1/events/${positionals.eventId}/rsvps`,
      options: { body: { status: positionals.status } }
    })
  },
  {
    id: 'event.guest.remove',
    tokens: ['event', 'guest', 'remove'],
    positionals: ['eventId', 'userId'],
    summary: 'Remove a guest RSVP from an event',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/rsvps/${positionals.userId}` })
  },
  {
    id: 'event.email-blast.list',
    tokens: ['event', 'email-blast', 'list'],
    positionals: ['eventId'],
    summary: 'List event email blasts',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/email-blasts` })
  },
  {
    id: 'event.email-blast.create',
    tokens: ['event', 'email-blast', 'create'],
    positionals: ['eventId'],
    summary: 'Create an event email blast',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/email-blasts` })
  },
  {
    id: 'event.email-blast.update',
    tokens: ['event', 'email-blast', 'update'],
    positionals: ['eventId', 'blastId'],
    summary: 'Update an event email blast',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/email-blasts/${positionals.blastId}` })
  },
  {
    id: 'event.email-blast.cancel',
    tokens: ['event', 'email-blast', 'cancel'],
    positionals: ['eventId', 'blastId'],
    summary: 'Cancel an event email blast',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/email-blasts/${positionals.blastId}` })
  },
  {
    id: 'registration.settings.get',
    tokens: ['registration', 'settings', 'get'],
    positionals: ['eventId'],
    summary: 'Get registration settings for an event',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/registration` })
  },
  {
    id: 'registration.settings.update',
    tokens: ['registration', 'settings', 'update'],
    positionals: ['eventId'],
    summary: 'Update registration settings for an event',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/registration` })
  },
  {
    id: 'registration.question.list',
    tokens: ['registration', 'question', 'list'],
    positionals: ['eventId'],
    summary: 'List registration questions',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/registration/questions` })
  },
  {
    id: 'registration.question.create',
    tokens: ['registration', 'question', 'create'],
    positionals: ['eventId'],
    summary: 'Create a registration question',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/registration/questions` })
  },
  {
    id: 'registration.question.update',
    tokens: ['registration', 'question', 'update'],
    positionals: ['eventId', 'questionId'],
    summary: 'Update a registration question',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/registration/questions/${positionals.questionId}` })
  },
  {
    id: 'registration.question.delete',
    tokens: ['registration', 'question', 'delete'],
    positionals: ['eventId', 'questionId'],
    summary: 'Delete a registration question',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/events/${positionals.eventId}/registration/questions/${positionals.questionId}` })
  },
  {
    id: 'registration.question.reorder',
    tokens: ['registration', 'question', 'reorder'],
    positionals: ['eventId'],
    summary: 'Reorder registration questions',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/registration/questions/reorder` })
  },
  {
    id: 'registration.submission.list',
    tokens: ['registration', 'submission', 'list'],
    positionals: ['eventId'],
    flags: [stringFlag('status'), stringFlag('limit'), stringFlag('offset')],
    summary: 'List registration submissions',
    buildRequest: ({ positionals, options }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/registration/submissions${queryString({ status: options.status, limit: options.limit, offset: options.offset })}` })
  },
  {
    id: 'registration.submission.get',
    tokens: ['registration', 'submission', 'get'],
    positionals: ['eventId', 'registrationId'],
    summary: 'Get a registration submission',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/registration/submissions/${positionals.registrationId}` })
  },
  {
    id: 'registration.submission.approve',
    tokens: ['registration', 'submission', 'approve'],
    positionals: ['eventId', 'registrationId'],
    summary: 'Approve a registration submission',
    acceptsJson: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/registration/submissions/${positionals.registrationId}/approve` })
  },
  {
    id: 'registration.submission.deny',
    tokens: ['registration', 'submission', 'deny'],
    positionals: ['eventId', 'registrationId'],
    summary: 'Deny a registration submission',
    acceptsJson: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/registration/submissions/${positionals.registrationId}/deny` })
  },
  {
    id: 'registration.my.get',
    tokens: ['registration', 'my', 'get'],
    positionals: ['eventId'],
    summary: 'Get the current user registration state for an event',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/registration/my` })
  },
  {
    id: 'registration.submit',
    tokens: ['registration', 'submit'],
    positionals: ['eventId'],
    summary: 'Submit a registration request',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/registration/submit` })
  },
  {
    id: 'notification.feed',
    tokens: ['notification', 'feed'],
    flags: [stringFlag('before'), stringFlag('after'), stringFlag('page-size'), boolFlag('include-archived')],
    summary: 'Fetch the notification feed',
    buildRequest: ({ options }) => ({ method: 'GET', path: `/v1/notifications/feed${queryString({ before: options.before, after: options.after, page_size: options['page-size'], include_archived: options['include-archived'] })}` })
  },
  {
    id: 'notification.get',
    tokens: ['notification', 'get'],
    positionals: ['notificationId'],
    summary: 'Fetch a single notification',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/notifications/messages/${positionals.notificationId}` })
  },
  {
    id: 'notification.seen',
    tokens: ['notification', 'seen'],
    positionals: ['notificationId'],
    summary: 'Mark a notification as seen',
    buildRequest: ({ positionals }) => ({ method: 'PUT', path: `/v1/notifications/messages/${positionals.notificationId}/seen` })
  },
  {
    id: 'notification.read',
    tokens: ['notification', 'read'],
    positionals: ['notificationId'],
    summary: 'Mark a notification as read',
    buildRequest: ({ positionals }) => ({ method: 'PUT', path: `/v1/notifications/messages/${positionals.notificationId}/read` })
  },
  {
    id: 'notification.archive',
    tokens: ['notification', 'archive'],
    positionals: ['notificationId'],
    summary: 'Archive a notification',
    buildRequest: ({ positionals }) => ({ method: 'PUT', path: `/v1/notifications/messages/${positionals.notificationId}/archived` })
  },
  {
    id: 'notification.bulk-seen',
    tokens: ['notification', 'bulk-seen'],
    summary: 'Bulk mark notifications as seen',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/messages/bulk/seen' })
  },
  {
    id: 'notification.bulk-read',
    tokens: ['notification', 'bulk-read'],
    summary: 'Bulk mark notifications as read',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/messages/bulk/read' })
  },
  {
    id: 'notification.bulk-archive',
    tokens: ['notification', 'bulk-archive'],
    summary: 'Bulk archive notifications',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/messages/bulk/archived' })
  },
  {
    id: 'notification.mark-all-seen',
    tokens: ['notification', 'mark-all-seen'],
    summary: 'Mark all notifications as seen',
    acceptsJson: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/mark-all/seen' })
  },
  {
    id: 'notification.mark-all-read',
    tokens: ['notification', 'mark-all-read'],
    summary: 'Mark all notifications as read',
    acceptsJson: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/mark-all/read' })
  },
  {
    id: 'notification.mark-all-archive',
    tokens: ['notification', 'mark-all-archive'],
    summary: 'Archive all notifications',
    acceptsJson: true,
    buildRequest: () => ({ method: 'PUT', path: '/v1/notifications/mark-all/archived' })
  },
  {
    id: 'campaign.event.get',
    tokens: ['campaign', 'event', 'get'],
    positionals: ['eventId'],
    summary: 'Get an event campaign',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/campaign` })
  },
  {
    id: 'campaign.event.create',
    tokens: ['campaign', 'event', 'create'],
    positionals: ['eventId'],
    summary: 'Create an event campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/campaign` })
  },
  {
    id: 'campaign.event.update',
    tokens: ['campaign', 'event', 'update'],
    positionals: ['eventId'],
    summary: 'Update an event campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'PATCH', path: `/v1/events/${positionals.eventId}/campaign` })
  },
  {
    id: 'campaign.event.feed',
    tokens: ['campaign', 'event', 'feed'],
    positionals: ['eventId'],
    summary: 'Get an event campaign feed',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/events/${positionals.eventId}/campaign/feed` })
  },
  {
    id: 'campaign.event.pledge',
    tokens: ['campaign', 'event', 'pledge'],
    positionals: ['eventId'],
    summary: 'Create an event campaign pledge intent',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/events/${positionals.eventId}/campaign/pledges` })
  },
  {
    id: 'campaign.profile.get',
    tokens: ['campaign', 'profile', 'get'],
    positionals: ['userId'],
    summary: 'Get a public profile campaign',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/users/${positionals.userId}/campaign` })
  },
  {
    id: 'campaign.profile.feed',
    tokens: ['campaign', 'profile', 'feed'],
    positionals: ['userId'],
    summary: 'Get a public profile campaign feed',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/users/${positionals.userId}/campaign/feed` })
  },
  {
    id: 'campaign.profile.get-self',
    tokens: ['campaign', 'profile', 'get-self'],
    summary: 'Get the current user profile campaign',
    buildRequest: () => ({ method: 'GET', path: '/v1/user/campaign' })
  },
  {
    id: 'campaign.profile.create-self',
    tokens: ['campaign', 'profile', 'create-self'],
    summary: 'Create the current user profile campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/user/campaign' })
  },
  {
    id: 'campaign.profile.update-self',
    tokens: ['campaign', 'profile', 'update-self'],
    summary: 'Update the current user profile campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'PATCH', path: '/v1/user/campaign' })
  },
  {
    id: 'campaign.profile.pledge',
    tokens: ['campaign', 'profile', 'pledge'],
    positionals: ['userId'],
    summary: 'Create a pledge intent for a public profile campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: ({ positionals }) => ({ method: 'POST', path: `/v1/users/${positionals.userId}/campaign/pledges` })
  },
  {
    id: 'campaign.profile.pledge-self',
    tokens: ['campaign', 'profile', 'pledge-self'],
    summary: 'Create a pledge intent for the current user profile campaign',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/user/campaign/pledges' })
  },
  {
    id: 'campaign.pledge.status',
    tokens: ['campaign', 'pledge', 'status'],
    positionals: ['pledgeId'],
    summary: 'Get campaign pledge status',
    buildRequest: ({ positionals }) => ({ method: 'GET', path: `/v1/campaign-pledges/${positionals.pledgeId}/status` })
  },
  {
    id: 'api-key.list',
    tokens: ['api-key', 'list'],
    summary: 'List API keys',
    buildRequest: () => ({ method: 'GET', path: '/v1/api-keys' })
  },
  {
    id: 'api-key.create',
    tokens: ['api-key', 'create'],
    summary: 'Create an API key',
    acceptsJson: true,
    requiresBody: true,
    buildRequest: () => ({ method: 'POST', path: '/v1/api-keys' })
  },
  {
    id: 'api-key.revoke',
    tokens: ['api-key', 'revoke'],
    positionals: ['id'],
    summary: 'Revoke an API key',
    buildRequest: ({ positionals }) => ({ method: 'DELETE', path: `/v1/api-keys/${positionals.id}` })
  }
];

export const COMMAND_PATTERNS = COMMAND_DEFINITIONS.flatMap((definition) => [
  { definition, tokens: definition.tokens },
  ...(definition.aliases ?? []).map((tokens) => ({ definition, tokens }))
]).sort((a, b) => b.tokens.length - a.tokens.length);

export function findCommandDefinition(tokens: string[]): { definition: CommandDefinition; matchedTokens: string[] } | undefined {
  const matched = COMMAND_PATTERNS.find((pattern) =>
    pattern.tokens.every((token, index) => tokens[index] === token)
  );
  if (!matched) {
    return undefined;
  }
  return {
    definition: matched.definition,
    matchedTokens: matched.tokens
  };
}

export function formatCommandPattern(definition: CommandDefinition): string {
  const parts = [...definition.tokens, ...(definition.positionals ?? []).map((name) => `<${name}>`)];
  const optional: string[] = [];
  if (definition.acceptsJson) {
    optional.push('[--data <json> | --data-file <path>]');
  }
  if (definition.acceptsFile) {
    optional.push('[--file <path>] [--content-type <mime>]');
  }
  for (const flag of definition.flags ?? []) {
    optional.push(flag.type === 'boolean' ? `[--${flag.name}]` : `[--${flag.name} <value>]`);
  }
  return [...parts, ...optional].join(' ');
}
