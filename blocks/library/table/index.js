/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * WordPress dependencies
 */
import { Fragment } from '@wordpress/element';
import {
	PanelBody,
	ToggleControl,
} from '@wordpress/components';
import classnames from 'classnames';

/**
 * Internal dependencies
 */
import './editor.scss';
import './style.scss';
import TableBlock from './table-block';
import BlockControls from '../../block-controls';
import BlockAlignmentToolbar from '../../block-alignment-toolbar';
import InspectorControls from '../../inspector-controls';

export const name = 'core/table';

export const settings = {
	title: __( 'Table' ),
	description: __( 'Tables. Best used for tabular data.' ),
	icon: 'editor-table',
	category: 'formatting',

	attributes: {
		content: {
			type: 'array',
			source: 'children',
			selector: 'table',
			default: [
				<tbody key="1">
					<tr><td><br /></td><td><br /></td><td><br /></td></tr>
					<tr><td><br /></td><td><br /></td><td><br /></td></tr>
				</tbody>,
			],
		},
		align: {
			type: 'string',
		},
		hasFixedLayout: {
			type: 'boolean',
			default: false,
		},
	},

	transforms: {
		from: [
			{
				type: 'raw',
				isMatch: ( node ) => node.nodeName === 'TABLE',
			},
		],
	},

	getEditWrapperProps( attributes ) {
		const { align } = attributes;
		if ( 'left' === align || 'right' === align || 'wide' === align || 'full' === align ) {
			return { 'data-align': align };
		}
	},

	edit( { attributes, setAttributes, isSelected, className } ) {
		const { content, hasFixedLayout } = attributes;
		const updateAlignment = ( nextAlign ) => setAttributes( { align: nextAlign } );
		const toggleFixedLayout = () => {
			setAttributes( { hasFixedLayout: ! hasFixedLayout } );
		};

		const classes = classnames(
			className,
			{
				'has-fixed-layout': hasFixedLayout,
			},
		);

		return (
			<Fragment>
				<BlockControls>
					<BlockAlignmentToolbar
						value={ attributes.align }
						onChange={ updateAlignment }
					/>
				</BlockControls>
				<InspectorControls>
					<PanelBody title={ __( 'Table Settings' ) } className="blocks-table-settings">
						<ToggleControl
							label={ __( 'Fixed width table cells' ) }
							checked={ !! hasFixedLayout }
							onChange={ toggleFixedLayout }
						/>
					</PanelBody>
				</InspectorControls>
				<TableBlock
					onChange={ ( nextContent ) => {
						setAttributes( { content: nextContent } );
					} }
					content={ content }
					className={ classes }
					isSelected={ isSelected }
				/>
			</Fragment>
		);
	},

	save( { attributes, className } ) {
		const { content, align, hasFixedLayout } = attributes;

		const classes = classnames(
			className,
			{
				'has-fixed-layout': hasFixedLayout,
			},
			align ? `align${ align }` : null,
		);

		return (
			<table className={ classes }>
				{ content }
			</table>
		);
	},
};
