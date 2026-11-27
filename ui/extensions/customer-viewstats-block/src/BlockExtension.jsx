import "@shopify/ui-extensions/preact";
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {data} = shopify;
  const customerId = data.selected?.[0]?.id?.replace(/^gid:\/\/shopify\/Customer\//, '');

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!customerId) {
      return;
    }

    let isMounted = true;

    async function loadInitialRows() {
      try {
        const response = await fetch(`/viewstats/${encodeURIComponent(customerId)}`);
        if (response.status === 204 || response.status === 404) {
          if (isMounted) {
            setRows([]);
          }
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch view stats: ${response.status}`);
        }

        const payload = await response.json();
        if (isMounted) {
          setRows(Array.isArray(payload) ? payload : payload?.videoUrl ? [payload] : []);
        }
      } catch (error) {
        console.error('Failed to fetch customer view stats:', error);
      }
    }

    loadInitialRows();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  return (
<s-box padding="none" border-width="1" border-color="border-subdued" border-radius="200">
  {/* The native Shopify Table component forces columns horizontally */}
  <s-table>
    {/* Explicit Sticky Table Header Strip */}
    <s-table-header-row background="bg-surface-secondary">
      <s-table-header><s-text font-weight="bold" listSlot="primary">Video URL</s-text></s-table-header>
      <s-table-header><s-text font-weight="bold">Coverage</s-text></s-table-header>
      <s-table-header><s-text font-weight="bold">Last Watched</s-text></s-table-header>
      <s-table-header><s-text font-weight="bold">Watchtime</s-text></s-table-header>
    </s-table-header-row>

    <s-table-body>
      {rows.map((row) => (
        <s-table-row key={`${row.customerId}-${row.videoUrl}`}>
          <s-table-cell><s-text variant="bodyMd">{row.videoUrl}</s-text></s-table-cell>
          <s-table-cell><s-text variant="bodyMd">{row.coveragePercent}%</s-text></s-table-cell>
          <s-table-cell><s-text variant="bodyMd">{new Date(row.timestamp).toLocaleString()}</s-text></s-table-cell>
          <s-table-cell><s-text variant="bodyMd">{new Date(row.uniqueSeconds * 1000).toISOString().slice(11, 19)}</s-text></s-table-cell>
        </s-table-row>
      ))}
    </s-table-body>
  </s-table>
</s-box>

  );
}
