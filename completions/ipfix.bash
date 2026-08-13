_ipfix_completions() {
  local commands="init config health ready summary views flows quality alerts inventory enrich export metrics performance benchmarks events api"
  COMPREPLY=( $(compgen -W "$commands --help --version --json --jq --template" -- "${COMP_WORDS[COMP_CWORD]}") )
}
complete -F _ipfix_completions ipfix
