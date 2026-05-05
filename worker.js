const NOTION_TOKEN = "SEU_TOKEN_AQUI"; // cole no Cloudflare Worker, nunca commite o valor real
const DATABASE_ID  = "357e094b37588063824cc2b9bb0111a3";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url    = new URL(req.url);
    const action = url.searchParams.get("action"); // list | create | update | delete

    const notionHeaders = {
      "Authorization":  `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type":   "application/json",
    };

    let notionUrl, notionMethod, notionBody;

    if (action === "list") {
      notionUrl    = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
      notionMethod = "POST";
      notionBody   = JSON.stringify({
        sorts: [{ property: "Recebido", direction: "descending" }],
        page_size: 100,
      });

    } else if (action === "create") {
      const data   = await req.json();
      notionUrl    = "https://api.notion.com/v1/pages";
      notionMethod = "POST";
      notionBody   = JSON.stringify(buildProperties(data));

    } else if (action === "update") {
      const pageId = url.searchParams.get("id");
      const data   = await req.json();
      notionUrl    = `https://api.notion.com/v1/pages/${pageId}`;
      notionMethod = "PATCH";
      notionBody   = JSON.stringify({ properties: buildProperties(data).properties });

    } else if (action === "delete") {
      const pageId = url.searchParams.get("id");
      notionUrl    = `https://api.notion.com/v1/pages/${pageId}`;
      notionMethod = "PATCH";
      notionBody   = JSON.stringify({ archived: true });

    } else {
      return new Response("Unknown action", { status: 400, headers: CORS });
    }

    const res  = await fetch(notionUrl, { method: notionMethod, headers: notionHeaders, body: notionBody });
    const json = await res.json();
    return new Response(JSON.stringify(json), {
      status:  res.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

function buildProperties(data) {
  const props = {
    Funcional: { title: [{ text: { content: data.funcional || "" } }] },
    Empresa:   { rich_text: [{ text: { content: data.empresa  || "" } }] },
    Jira:      { rich_text: [{ text: { content: data.jira     || "" } }] },
    Status:    { select: { name: data.status || "andamento" } },
  };

  if (data.data)          props["Recebido"]  = { date: { start: data.data } };
  if (data.dataConcluido) props["Concluído"] = { date: { start: data.dataConcluido } };
  if (data.prazo)         props["Prazo"]     = { date: { start: data.prazo } };

  return { parent: { database_id: DATABASE_ID }, properties: props };
}
