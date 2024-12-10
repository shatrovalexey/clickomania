Number.prototype.rand = function( ) {
	return Math.floor( Math.random( ) * this ) ;
} ;
Array.prototype.sample = function( ) {
	return this.at( this.length.rand( ) ) ;
} ;
Array.prototype.range = function( size ) {
	return [ ... Array( Math.floor( size ) ).keys( ) ] ;
} ;

( ( win , width , height , probability ) => {
	/**
	* Справочник ячеек
	*/
	const cells_all = { } ;
	const { "document" : doc , } = win ;

	/**
	* Возможные цвета ячеек
	*/
	const colors = (
		( max , accuracy ) => {
			const size = Math.pow( width * height , probability ) ;
			const colors = new Set( ) ;
			const step = 135 ;
			const max_current = ( max / step ).rand( ) ;

			do {
				colors.add( max_current.rand( ) * step ) ;
			} while ( colors.size < size ) ;

			return [ ... colors ].map( color => '#' + color.toString( accuracy ).padEnd( 6 , 0 ) ) ;
		}
	)( 0xffffff , 0x10 ) ;

	/**
	* Найти все соседние ячейки
	*/
	const cells_find = ( cell , cells_found = { } ) => {
		const {
			"dataset" : {
				"x" : x ,
				"y" : y ,
				"color" : color ,
			} ,
		} = cell ;

		Object.values( cells_all ) .
			filter(
				( {
					"dataset" : {
						"color" : color_current ,
						"name" : name_current ,
						"x" : x_current ,
						"y" : y_current ,
					}
				} ) =>
					( color_current == color ) &&
					( ! ( name_current in cells_found ) ) &&
					( Math.abs( x - x_current ) + Math.abs( y - y_current ) == 1 )
			) .
			forEach( cell_current => {
				cells_found[ cell_current.dataset.name ] = cell_current ;
				cells_find( cell_current , cells_found ) ;
			} ) ;
		
		return cells_found ;
	} ;

	/**
	* Изменить цвет ячейки
	*/
	const cell_color = ( cell , color = "" , style_property = "background-color" ) => {
		const { "dataset" : { "color" : color_current , } , } = cell ;

		if ( color_current == color ) {
			return true ;
		}

		const { "dataset" : dataset , "style" : style , } = cell ;

		style[ style_property ] = dataset.color = color ;

		return true ;
	} ;

	/**
	* Сделать ячейку пустой
	*/
	const cells_destroy = cells_found => Object.values( cells_found ).map( cell_current => cell_color( cell_current ) ) ;

	/**
	* Ячейка пуста
	*/
	const cell_empty = ( { "dataset" : { "color" : color , } , } ) => ! color ;

	/**
	* Имя ячейки
	*/
	const cell_name = ( { "dataset" : { "x" : x , "y" : y , } , } , ax = 0 , ay = 0 ) => [ parseInt( x ) + ax , parseInt( y ) + ay ].join( '_' ) ;

	/**
	* Поменять ячейки местами
	*/
	const cells_change = ( cell_current , cell_next ) => [
			[ cell_current , cell_next.dataset.color , ] ,
			[ cell_next , ] ,
	].forEach( args => cell_color( ... args ) ) ;

	/**
	* Ячейка не пуста и существует
	*/
	const cell_exists = name => ( name in cells_all ) && ! cell_empty( cells_all[ name ] ) ;

	/**
	* Движение ячеек вниз
	*/
	const cells_shift_down = ( ) => {
		const x_was = new Set( ) ;

		Object .
			values( cells_all ) .
			filter( cell => ( cell.dataset.y > 0 ) && cell_empty( cell ) ) .
			sort( ( { "dataset" : { "x" : ax , "y" : ay , } , } , { "dataset" : { "x" : bx , "y" : by , } , } ) => ( ax - bx ) || ( by - ay ) ) .
			forEach(
				cell => {
					if ( x_was.has( cell.dataset.x ) ) {
						return ;
					}

					const name = cell_name( cell , 0 , -1 ) ;

					if ( ! cell_exists( name ) ) {
						return ;
					}

					x_was.add( cell.dataset.x ) ;

					cells_change( cell , cells_all[ name ] ) ;
				}
			) ;

		if ( x_was.size > 0 ) {
			cells_shift_down( ) ;
		}
	} ;

	/**
	* Движение ячеек влево
	*/
	const cells_shift_left = ( ) => {
		const columns = [ ].range( width ).map( value => [ ] ) ;

		Object .
			values( cells_all ) .
			filter( cell => cell_empty( cell ) ) .
			forEach( cell => columns[ cell.dataset.x ].push( cell ) ) ;

		const column = columns .
			filter( column => column.length == height ) .
			find( column => column.find( cell => cell_exists( cell_name( cell , 1 ) ) ) ) ;

		if ( ! column ) {
			return ;
		}

		column.forEach( cell => {
			const name = cell_name( cell , 1 ) ;

			if ( cell_exists( name ) ) {
				cells_change( cell , cells_all[ name ] ) ;
			}
		} ) ;

		cells_shift_left( ) ;
	} ;

	/**
	* Конец игры
	*/
	const is_game_over = (
		( ) => {
			const is_game_over_matrix = [
				[ 1 , 0 ] ,
				[ 0 , 1 ] ,
				[ - 1 , 0 ] ,
				[ 0 , - 1 ] ,
			] ;

			return ( ) => {
				const cell = Object .
					values( cells_all ) .
					filter( cell => ! cell_empty( cell ) ) .
					find( cell => {
						const color = cell.dataset.color ;

						return is_game_over_matrix.find( ( [ ax , ay , ] ) => {
							const name = cell_name( cell , ax , ay ) ;

							return cell_exists( name ) && ( color == cells_all[ name ].dataset.color ) ;
						} ) ;
					} ) ;

				if ( ! cell ) {
					doc.querySelector( ".game-over" ).classList.add( "active" ) ;
				}
			}
		}
	)( ) ;

	/**
	* Заполнение таблицы ячейками
	*/
	doc.querySelectorAll( ".wrapper .grid" ).forEach( grid => {
		doc.querySelectorAll( ".game-new,.game-over" ).forEach(
			node_current => node_current.addEventListener( "click" , ( ) => win.location.reload( ) )
		) ;

		grid.addEventListener( "click" , ( { "target" : cell , } ) => {
			if ( ! cell.classList.contains( "cell" ) || cell_empty( cell ) ) {
				return false ;
			}

			const cells_found = {  } ;

			cells_find( cell , cells_found ) ;
			cells_destroy( cells_found ) ;
			cells_shift_down( ) ;
			cells_shift_left( ) ;
			is_game_over( ) ;

			return true ;
		} ) ;

		const cell_add = ( className , sub = null ) => {
			const cell = doc.createElement( "div" ) ;

			grid.appendChild( cell ) ;

			if ( sub ) {
				sub( cell ) ;
			}

			cell.classList.add( className ) ;

			return cell ;
		} ;

		[ ].range( height ).forEach( y => {
			[ ].range( width ).forEach( x =>
				cell_add( "cell" , cell => {
					cell.dataset.x = x ;
					cell.dataset.y = y ;
					cells_all[ cell.dataset.name = cell_name( cell ) ] = cell ;
					cell_color( cell , colors.sample( ) ) ;
				} )
			) ;

			cell_add( "wrap" ) ;
		} ) ;
	} ) ;
} )( window , 16 , 6 , 15 / 14 / Math.PI ) ;