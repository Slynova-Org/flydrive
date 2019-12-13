export const MetadataConverter = {
    kebabToCamel (o: {[kebabs: string]: string}): {[camels: string]: string} {
        const result = {};

        for (const kebab in o) {
            if(o.hasOwnProperty(kebab)) {
                const camel = kebab.replace(/-+([a-z])/g, (g) => g[1].toUpperCase());
                result[camel] = o[kebab];
            }
        }

        return result
    },

    camelToKebab(o: {[camels: string]: string}): {[kebabs: string]: string} {
        const result = {};

        for (const camel in o) {
            if(o.hasOwnProperty(camel)) {
                const kebab = camel
                    .replace(/^[A-Z]+/, (g) => g[0].toLowerCase())
                    .replace(/[A-Z]+/g, (g) => '-' + g[0].toLowerCase());
                result[kebab] = o[camel];
            }
        }

        return result;
    },

    camelToSnake(o: {[camels: string]: string}): {[snakes: string]: string} {
        const result = {};

        for (const camel in o) {
            if(o.hasOwnProperty(camel)) {
                const snake = camel
                    .replace(/^[A-Z]+/, (g) => g[0].toLowerCase())
                    .replace(/[A-Z]+/g, (g) => '_' + g[0].toLowerCase());
                result[snake] = o[camel];
            }
        }

        return result;
    },

    snakeToCamel (o: {[snakes: string]: string}): {[camels: string]: string} {
        const result = {};

        for (const snake in o) {
            if(o.hasOwnProperty(snake)) {
                const camel = snake.replace(/_+([a-z])/g, (g) => g[1].toUpperCase());
                result[camel] = o[snake];
            }
        }

        return result
    },

    checkKeys(o: {[keys: string]: string}): boolean {
        for (const key in o) {
           if (!key.match(/^[a-z]+([A-Z][a-z]+)*$/)) {
               return false;
           }
        }

        return true;
    },
};
