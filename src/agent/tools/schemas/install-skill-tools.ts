import type { AgentToolSchema } from '../../tool-schema';


export const INSTALL_SKILL_TOOL_SCHEMAS: AgentToolSchema[] = [
 {
 name: 'install_skill',
 description: ' GitHub skill ~/.lazynext/skills/<slug>/ SKILL.md references/scripts/assets/examplesLibrary /skill:<slug> repo GitHub URL owner/repo Jane-xiaoer/paper-collage-ad-codexslug SKILL.md name ',
 input_schema: {
 type: 'object',
 properties: {
 repo: { type: 'string', description: 'GitHub repository URLhttps://github.com/owner/repo owner/repo' },
 slug: { type: 'string', description: 'Install directory kebab-case SKILL.md frontmatter name ' },
 },
 required: ['repo'],
 },
 },
];

export const INSTALL_SKILL_TOOL_NAMES = new Set(INSTALL_SKILL_TOOL_SCHEMAS.map((t) => t.name));
