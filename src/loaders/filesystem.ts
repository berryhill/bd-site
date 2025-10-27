import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export interface FilesystemLoaderOptions {
  baseDir: string;
}

interface LiveEntry {
  id: string;
  data: Record<string, unknown>;
  body: string;
  filePath: string;
}

interface FilterOptions {
  draft?: boolean;
  [key: string]: unknown;
}

export function filesystemLoader(options: FilesystemLoaderOptions) {
  const { baseDir } = options;

  return {
    name: "filesystem-loader",

    async loadCollection({ filter }: { filter?: FilterOptions } = {}) {
      try {
        const fullPath = path.resolve(baseDir);
        const entries: LiveEntry[] = [];

        // Read all markdown files from the directory
        async function readDir(dir: string): Promise<void> {
          const items = await fs.readdir(dir, { withFileTypes: true });

          for (const item of items) {
            const itemPath = path.join(dir, item.name);

            if (item.isDirectory()) {
              await readDir(itemPath);
            } else if (
              item.isFile() &&
              item.name.endsWith(".md") &&
              !item.name.startsWith("_")
            ) {
              // Read and parse the markdown file
              const fileContent = await fs.readFile(itemPath, "utf-8");
              const { data, content } = matter(fileContent);

              // Generate ID from file path relative to base directory
              const relativePath = path.relative(fullPath, itemPath);
              const id = relativePath.replace(/\.md$/, "");

              const entry = {
                id,
                data,
                body: content,
                filePath: relativePath,
              };

              // Apply filter if provided (draft filtering, etc)
              if (!filter || (filter.draft === undefined || entry.data.draft === filter.draft)) {
                entries.push(entry);
              }
            }
          }
        }

        await readDir(fullPath);

        return {
          entries,
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading collection:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },

    async loadEntry({ filter }: { filter?: string | FilterOptions } = {}) {
      try {
        const fullPath = path.resolve(baseDir);

        // If filter has an id, use it to load specific entry
        if (typeof filter === "string") {
          const filePath = path.join(fullPath, `${filter}.md`);

          // Check if file exists
          try {
            await fs.access(filePath);
          } catch {
            return {
              error: new Error(`Entry not found: ${filter}`),
            };
          }

          // Read and parse the file
          const fileContent = await fs.readFile(filePath, "utf-8");
          const { data, content } = matter(fileContent);

          return {
            entry: {
              id: filter,
              data,
              body: content,
              filePath: path.relative(fullPath, filePath),
            },
          };
        }

        // If filter is an object, try to find matching entry
        if (filter && typeof filter === "object") {
          // Read all files and find match
          const { entries } = await this.loadCollection({ filter: {} });

          if (!entries || entries.length === 0) {
            return {
              error: new Error("No entries found"),
            };
          }

          // Find entry matching filter criteria
          const entry = entries.find((e: LiveEntry) => {
            return Object.keys(filter).every(key => e.data[key] === filter[key]);
          });

          if (!entry) {
            return {
              error: new Error("Entry not found matching filter"),
            };
          }

          return { entry };
        }

        return {
          error: new Error("Invalid filter provided to loadEntry"),
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading entry:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  };
}
