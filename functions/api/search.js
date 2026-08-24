export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const query = searchParams.get('query');

  const NOTION_KEY = context.env.NOTION_KEY;
  const DATABASE_ID = context.env.NOTION_DATABASE_ID;

  if (!NOTION_KEY || !DATABASE_ID) {
    return new Response(JSON.stringify({ error: 'Missing Notion Key or Database ID' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query ? {
        filter: {
          property: 'Hotel',
          title: { contains: query },
        },
      } : {}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error fetching from Notion');
    }

    const results = data.results.map((page) => {
      const props = page.properties;

      let contractUrl = '#';
      const filesCol = props['Files & media'];
      if (filesCol?.files?.length > 0) {
        contractUrl = filesCol.files[0].file?.url || filesCol.files[0].external?.url;
      }

      const rawDate = props['EXP']?.date?.start;
      let formattedDate = '-';
      if (rawDate) {
        const [yyyy, mm, dd] = rawDate.split('-');
        formattedDate = `${dd}/${mm}/${yyyy}`;
      }

      const locationName = props['Location']?.select?.name || '';

      return {
        id: page.id,
        name: props['Hotel']?.title[0]?.plain_text || 'Untitled',
        location: locationName,
        contractUrl: contractUrl,
        expiryDate: formattedDate,
      };
    });

    return new Response(JSON.stringify(results), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}