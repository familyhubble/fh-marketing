import { defineAction } from 'astro:actions';

const emailOctopusApiKey = import.meta.env.EMAIL_API_KEY;
const listId = import.meta.env.LIST_ID;

export const server = {
  privateBetaSignup: defineAction({
    accept: 'form',
    handler: async (formData) => {
      const data = Object.fromEntries(formData.entries());
      const tags = ['private-beta'];
      console.info('[privateBetaSignup] submission', data);

      // Honeypot: silently drop if bot fills hidden field
      const honey = formData.get('company');
      if (typeof honey === 'string' && honey.trim().length > 0) {
        console.warn('[privateBetaSignup] honeypot triggered');
        return {
          success: false,
          status: 400,
          message: 'Invalid submission.',
          values: data,
        };
      }

      // Time trap: require at least 2 seconds between render and submit
      const renderedAtRaw = formData.get('renderedAt');
      const renderedAt =
        typeof renderedAtRaw === 'string' ? Number(renderedAtRaw) : 0;
      const elapsedMs = Date.now() - (isFinite(renderedAt) ? renderedAt : 0);
      if (!renderedAt || elapsedMs < 2000) {
        console.warn('[privateBetaSignup] time trap triggered', { elapsedMs });
        return {
          success: false,
          status: 400,
          message: 'Please try again.',
          values: data,
        };
      }

      if (data.mobileInterest) {
        tags.push('mobile-interested');
      }

      const contactData = {
        emailAddress: data.EmailAddress,
        fields: {
          FirstName: data.FirstName,
          LastName: data.LastName,
          primaryDevice: data.primaryDevice,
          childrenCount: Number(data.childrenCount),
          maritalStatus: data.maritalStatus,
          mobileInterest: data.mobileInterest === 'on' ? 'Yes' : 'No',
        },
        tags,
        status: 'subscribed',
      };

      try {
        const response = await fetch(
          `https://api.emailoctopus.com/lists/${listId}/contacts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${emailOctopusApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData),
          },
        );
        const body = await response.json();

        switch (response.status) {
          case 201:
          case 409:
            return { success: true };
          case 422: {
            const fieldErrors = {} as Record<string, string[]>;

            const addFieldError = (
              fieldName: string | null,
              message: string,
            ) => {
              const key = fieldName ?? '_global';
              if (!fieldErrors[key]) fieldErrors[key] = [];
              fieldErrors[key].push(message);
            };

            if (Array.isArray(body.errors)) {
              for (const err of body.errors) {
                const message =
                  err?.detail ?? body.detail ?? 'Unprocessable content.';
                addFieldError(pointerToField(err?.pointer), message);
              }
            } else {
              addFieldError(null, body?.detail ?? 'Unprocessable content.');
            }

            console.error('[privateBetaSignup] 422 Unprocessable Entity', {
              status: response.status,
              apiBody: body,
              fieldErrors,
              values: data,
            });

            return {
              success: false,
              status: 422,
              message: body.detail,
              fieldErrors,
              values: data,
            };
          }
          default:
            console.error('[privateBetaSignup] API error', {
              status: response.status,
              apiBody: body,
            });
            return {
              success: false,
              status: response.status,
              message: body.detail,
              values: data,
            };
        }
      } catch (error) {
        console.error('[privateBetaSignup] unexpected error', {
          error,
        });
        return {
          success: false,
          status: 500,
          message: 'Unexpected error. Please try again later.',
          values: data,
        };
      }
    },
  }),
};

export const actions = server;

function pointerToField(pointer: string | undefined | null): string | null {
  if (!pointer) return null;
  if (pointer === '/email_address') return 'EmailAddress';
  if (pointer.startsWith('/fields/')) {
    const raw = pointer.split('/')[2] ?? '';
    const known = [
      'FirstName',
      'LastName',
      'primaryDevice',
      'childrenCount',
      'maritalStatus',
      'mobileInterest',
    ];
    const match = known.find((k) => k.toLowerCase() === raw.toLowerCase());
    return match ?? raw;
  }
  return null;
}
