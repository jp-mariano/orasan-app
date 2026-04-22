import { getOperatorContact } from '@/lib/operator-contact';

/**
 * Shows operator name, email, and/or support URL when env is set; otherwise
 * a short fallback for multi-tenant or self-hosted contexts.
 */
export function OperatorContactCard() {
  const c = getOperatorContact();

  if (!c.hasConfiguredContact) {
    return (
      <p className="text-gray-800">
        Contact details for this instance have not been configured. For
        self-hosted deployments, your administrator is the appropriate contact.
        Public deployments should set
        <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_OPERATOR_*
        </code>
        in the environment.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 space-y-2 shadow-sm">
      {c.legalName ? (
        <p>
          <span className="font-medium text-gray-900">Operator: </span>
          {c.legalName}
        </p>
      ) : null}
      {c.email ? (
        <p>
          <span className="font-medium text-gray-900">Email: </span>
          <a
            className="text-blue-600 hover:underline"
            href={`mailto:${c.email}`}
          >
            {c.email}
          </a>
        </p>
      ) : null}
      {c.supportUrl ? (
        <p>
          <span className="font-medium text-gray-900">Web: </span>
          <a
            className="text-blue-600 hover:underline"
            href={c.supportUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {c.supportUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
