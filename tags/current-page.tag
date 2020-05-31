<current-page>
	
	<div class="ui container">
		<div class="ui horizontal divider"><i1-8n>currentpage.title</i1-8n></div>
		<div class="ui segment">
			<div class="ui items" if={ !opts.connection.page }>
				<div class="item">
					<button class="ui button" onclick={ contentReload }><i1-8n>currentpage.retry</i1-8n></button>
					<div class="middle aligned content">
						<h4 class="ui header">
							<i1-8n>currentpage.unavailable</i1-8n>
							<div class="sub header"><i1-8n>currentpage.unavailable.subheader1</i1-8n></div>
							<div class="sub header"><i1-8n>currentpage.unavailable.subheader2</i1-8n></div>
						</h4>
					</div>
				</div>
			</div>
			<div if={ opts.connection.page } class="ui middle aligned relaxed divided list">
				<div class="item">
					<div class="right floated content" data-key={ key }>

						<button class={ (opts.current.champion && opts.connection.page && opts.plugins.local[opts.tab.active]) ? "ui icon button" : "ui icon button disabled"} onclick={ downloadCurrentPage } data-tooltip="{ i18n.localise('currentpage.downloadcurrentpage') }" data-position="left center" data-inverted="">
							<i class="download icon"></i>
						</button>
					</div>

					<div class="ui image">
						<div each={ index in [0,1,2,3,4,5,6,7,8] } class="ui circular icon button tooltip current-page-tooltip" style="margin: 0; padding: 0; background-color: transparent; cursor: default;"
						data-html={findTooltip(index)}>
							<img draggable="false" class="ui mini circular image" src=./img/runesReforged/perk/{(opts.connection.page && opts.connection.page.selectedPerkIds[index] && opts.connection.page.selectedPerkIds[index] !== -1) ? opts.connection.page.selectedPerkIds[index] : "qm"}.png>
						</div>
					</div>

					
					<div class="middle aligned content" style="width: auto;" >
						<i class={ opts.connection.page ? (!opts.connection.page.isEditable || opts.connection.summonerLevel < 10 ? "lock icon" : (opts.connection.page.isValid ? "" : "red warning sign icon")) : "" }></i> {opts.connection.page ? opts.connection.page.name : ""}
					</div>
				</div>
			</div>
		</div>
	</div>

	<script>

		this.on('updated', function() {
			$('.current-page-tooltip').popup()
		});

		findTooltip(index) {
			if(!opts.tooltips.rune) return;
			var tooltip = opts.tooltips.rune.find((el) => el.id === opts.connection.page.selectedPerkIds[index]);
			return '<b>' + tooltip.name + '</b><br>' + tooltip.longDesc;
		}
		
		downloadCurrentPage(evt) {
			evt.preventUpdate = true;
			freezer.emit("currentpage:download");
		}

		contentReload(evt) {
			evt.preventUpdate = true;
			freezer.emit("content:reload");
		}

	</script>
</current-page>