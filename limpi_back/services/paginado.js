const paginador = async (pagina, totalPage) => {
    let next
    let prev
    let cantidad_por_pagina
    // let skip
    if (pagina === 1) {
        next = pagina + 1
        prev = 'null'
        cantidad_por_pagina = parseInt(process.env.CANTIDAD_ITEM_PAGINA)
        if (pagina === totalPage) {
            next = "null"
        }
    } else if (pagina > 1 && pagina < totalPage) {
        next = pagina + 1;
        prev = pagina - 1;
        cantidad_por_pagina = parseInt(process.env.CANTIDAD_ITEM_PAGINA);
    } else if (pagina === totalPage) {
        next = "null";
        prev = pagina - 1;
        cantidad_por_pagina = parseInt(process.env.CANTIDAD_ITEM_PAGINA);
    } else {
        next = "null";
        prev = "null";
        cantidad_por_pagina = parseInt(process.env.CANTIDAD_ITEM_PAGINA);
    }
    let skip = (pagina-1)*parseInt(process.env.CANTIDAD_ITEM_PAGINA)
    return {
        next,
        prev,
        cantidad_por_pagina,
        skip
    }
}

module.exports = {
    paginador
}