import Head from 'next/head';
import { useState } from 'react';
import useSWR from 'swr';
import useDebounce from '../utils/debounce';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function useRegistrarData(tld) {
  const { data, error, isValidating } = useSWR(
    tld ? `/api/registrar-check?tld=${tld}` : null,
    fetcher
  );

  return [data, error, isValidating];
}

function RegistrarTable(props) {
  const { data } = props;

  if (!data?.length) return;

  return (
    <div className="relative max-w-sm mx-auto mt-8 overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th className="px-6 py-3">Registrar</th>
            <th className="px-6 py-3">Available</th>
            <th className="px-6 py-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="bg-white border-b">
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                {row.name}
              </td>
              <td className="px-6 py-4">
                {row.listed ?
                  ('Yes' + (row.registerPrice ? ` ($${row.registerPrice})` : ''))
                  : 'No'
                }
              </td>
              <td className="px-6 py-4">
                {row.listed && <a
                  href={row.tldUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline">
                  Open
                </a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [tld, setTld] = useState('');
  const debouncedTld = useDebounce(tld, 1000);

  const [registrarData, error, loading] = useRegistrarData(debouncedTld);

  return (
    <div className="flex flex-col min-h-screen">
      <Head>
        <title>TLD Registrar Check</title>
      </Head>

      <header className="px-4 mt-12 text-2xl font-black text-center text-gray-500 lg:mt-20">
        Check if your TLD has been listed on all registrars
      </header>

      <main className="flex-grow mt-8">
        <div className="text-center">
          <input
            type="text"
            className="p-2 text-lg font-medium text-center border-4 border-gray-500 border-opacity-50 rounded-lg"
            placeholder="Type TLD here"
            value={tld}
            onChange={(e) => setTld(e.target.value)}
          />
        </div>

        {tld === debouncedTld && !loading &&
          <RegistrarTable data={registrarData} />
        }

        {(tld !== debouncedTld || loading) &&
          <p className="px-12 mt-8 text-center">
            Loading...<br />
            (this can take several seconds for the first search)
          </p>
        }

        <p className="px-4 mt-8 text-center text-red-700">{error}</p>
      </main>

      <footer
        className="flex-shrink-0 w-full py-2 text-center"
      >
        <p className="text-sm font-medium">
          Made with ♥️ by {' '}
          <a href="https://blek.space"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Rithvik Vibhu
          </a> | {' '}
          <a
            href="https://htools.work"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >HTools</a>
        </p>
      </footer>
    </div>
  );
}
