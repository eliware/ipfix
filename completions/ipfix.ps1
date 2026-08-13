Register-ArgumentCompleter -Native -CommandName ipfix -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  'init','config','health','ready','summary','views','flows','quality','alerts','inventory','enrich','export','metrics','performance','benchmarks','events','api','--help','--version','--json','--jq','--template' |
    Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
}
